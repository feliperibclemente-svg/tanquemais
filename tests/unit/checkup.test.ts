import { describe, expect, it } from "vitest";
import { CHECKUP_QUESTIONS, questionsFor } from "@/content/checkup";
import {
  consumptionDrop,
  evaluateCheckup,
  oilStatus,
  workshopSummary,
  type ConsumptionDrop,
} from "@/services/checkup";
import type { FuelingComputed } from "@/services/analytics";

const row = (kml: number | null, fuel = "gasolina", issue: string | null = null) =>
  ({ computed_km_per_liter: kml, fuel_type_id: fuel, issue }) as unknown as FuelingComputed;

describe("perguntas", () => {
  it("carro e moto recebem perguntas próprias", () => {
    const carro = questionsFor("carro").map((q) => q.id);
    const moto = questionsFor("moto").map((q) => q.id);
    expect(carro).toContain("direcao");
    expect(carro).not.toContain("corrente");
    expect(moto).toContain("corrente");
    expect(moto).not.toContain("temperatura");
    expect(questionsFor(null)).toEqual(questionsFor("carro"));
  });
  it("tom de dica: nunca afirma defeito nem promete economia", () => {
    for (const q of CHECKUP_QUESTIONS) {
      for (const opt of q.options) {
        const t = `${opt.finding?.body ?? ""} ${opt.note ?? ""}`;
        expect(t, q.id).not.toMatch(
          /seu (carro|veículo|motor) (tem|está com)|com certeza|garant|econom/i,
        );
      }
    }
  });
  it("freio, temperatura, cheiro e pneu danificado são alerta", () => {
    for (const id of ["freio_pedal", "freio_manete", "temperatura", "cheiro", "pneu"]) {
      const q = CHECKUP_QUESTIONS.find((x) => x.id === id)!;
      expect(q.options.find((o) => o.value === "sim")?.finding?.severity, id).toBe("urgente");
    }
  });
});

describe("consumo abaixo do normal", () => {
  it("avisa a partir de 15% abaixo da mediana do mesmo combustível", () => {
    const drop = consumptionDrop([row(10), row(12), row(12.2), row(11.8)]);
    expect(drop?.typical).toBe(12);
    expect(drop?.drop).toBeCloseTo(0.1667, 3);
    expect(consumptionDrop([row(10.5), row(12), row(12.2), row(11.8)])).toBeNull();
  });
  it("precisa de 3 trechos anteriores no mesmo combustível; ignora trechos fora do padrão", () => {
    expect(consumptionDrop([row(9), row(12), row(12)])).toBeNull();
    expect(consumptionDrop([row(9), row(8, "etanol"), row(12), row(12)])).toBeNull();
    expect(consumptionDrop([row(5, "gasolina", "outlier"), row(12), row(12), row(12)])).toBeNull();
  });
});

describe("troca de óleo", () => {
  it("em dia, perto e vencida", () => {
    expect(oilStatus({ lastKm: 40000, intervalKm: 10000, currentKm: 45000 })).toMatchObject({
      state: "ok",
      remaining: 5000,
    });
    expect(oilStatus({ lastKm: 40000, intervalKm: 10000, currentKm: 49200 }).state).toBe("soon");
    expect(oilStatus({ lastKm: 40000, intervalKm: 10000, currentKm: 50300 })).toMatchObject({
      state: "due",
      over: 300,
    });
  });
  it("sem dados ou km incoerente: não sabemos", () => {
    expect(oilStatus({ lastKm: null, intervalKm: 10000, currentKm: 1 }).state).toBe("unknown");
    expect(oilStatus({ lastKm: 50000, intervalKm: 10000, currentKm: 40000 }).state).toBe("unknown");
  });
});

describe("resultado e resumo para a oficina", () => {
  const questions = questionsFor("carro");
  it("alertas primeiro, depois o que conferir; 'Não sei' vira orientação", () => {
    const consumption: ConsumptionDrop = { last: 10, typical: 12, drop: 0.17 };
    const r = evaluateCheckup({
      questions,
      answers: { freio_ruido: "sim", cheiro: "sim", luz_alerta: "nao_sei", direcao: "nao" },
      consumption,
      oil: { state: "due", over: 300, dueKm: 50000 },
    });
    expect(r.findings.map((f) => f.id)).toEqual(["cheiro", "freio_ruido", "oleo", "consumo"]);
    expect(r.notes).toHaveLength(1);
    expect(r.findings.find((f) => f.id === "consumo")?.body).toContain("17% abaixo");
  });
  it("tudo certo: nenhum achado", () => {
    const answers = Object.fromEntries(questions.map((q) => [q.id, "nao"]));
    expect(
      evaluateCheckup({ questions, answers, consumption: null, oil: { state: "unknown" } })
        .findings,
    ).toEqual([]);
  });
  it("resumo com veículo, km, o que verificar e última troca de óleo", () => {
    const { findings } = evaluateCheckup({
      questions,
      answers: { freio_ruido: "sim" },
      consumption: null,
      oil: { state: "unknown" },
    });
    const text = workshopSummary({
      vehicle: "Fiat Argo",
      currentKm: 48210,
      findings,
      oilLastKm: 41000,
    });
    expect(text).toContain("Fiat Argo, 48.210 km.");
    expect(text).toContain("Peço, por favor:");
    expect(text).toContain("• Verificar pastilhas e discos de freio (chiado ou rangido ao frear).");
    expect(text).toContain("Última troca de óleo: 41.000 km.");
  });
});
