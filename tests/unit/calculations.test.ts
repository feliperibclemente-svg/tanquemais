/**
 * Auditoria matemática do Tanque+: cada teste documenta a fórmula com um exemplo que dá
 * para conferir de cabeça. Unidades: km, litros (L), reais (R$).
 */
import { describe, expect, it } from "vitest";
import { computeFuelings, overview } from "@/services/analytics";
import { buildInsights } from "@/services/insights";
import { savingsOpportunity } from "@/services/analytics";
import { checkPhrase, numbersAreGrounded } from "@/services/tanque-ia-guard";
import type { Fueling } from "@/types/domain";

/** Abastecimento em setembro/2026 (dia, km, litros, R$/L, tanque cheio?, combustível). */
const f = (
  id: string,
  day: number,
  odometer: number,
  liters: number,
  price: number,
  full = true,
  fuel = "gasolina",
): Fueling =>
  ({
    id,
    vehicle_id: "v1",
    fuel_type_id: fuel,
    filled_at: new Date(2026, 8, day, 12).toISOString(),
    odometer,
    liters,
    price_per_liter: price,
    total_cost: Number((liters * price).toFixed(2)),
    full_tank: full,
  }) as Fueling;

const kml = (rows: ReturnType<typeof computeFuelings>, id: string) =>
  rows.find((r) => r.id === id)?.computed_km_per_liter ?? null;

describe("consumo: tanque cheio → tanque cheio", () => {
  it("trecho simples: 480 km ÷ 40 L = 12 km/L e R$ 240 ÷ 480 km = R$ 0,50/km", () => {
    const rows = computeFuelings([f("1", 1, 10000, 40, 6), f("2", 8, 10480, 40, 6)]);
    expect(kml(rows, "1")).toBeNull(); // o primeiro só abre o trecho
    expect(kml(rows, "2")).toBeCloseTo(12);
    expect(rows[0].computed_cost_per_km).toBeCloseTo(0.5);
  });

  it("parciais entram na soma de litros: 600 km ÷ (10 + 40) L = 12 km/L", () => {
    const rows = computeFuelings([
      f("1", 1, 10000, 40, 6),
      f("2", 4, 10200, 10, 6, false),
      f("3", 8, 10600, 40, 6),
    ]);
    expect(kml(rows, "2")).toBeNull();
    expect(kml(rows, "3")).toBeCloseTo(12);
    expect(rows[0].interval_cost).toBeCloseTo(300); // R$ 60 + R$ 240
  });

  it("sem o tanque cheio de fechamento não há medição", () => {
    const rows = computeFuelings([f("1", 1, 10000, 40, 6), f("2", 8, 10480, 30, 6, false)]);
    expect(overview(rows).avgKmPerLiter).toBeNull();
  });

  it("consumo fora de 3–40 km/L é tratado como erro de digitação", () => {
    const rows = computeFuelings([f("1", 1, 10000, 40, 6), f("2", 8, 10050, 40, 6)]);
    expect(kml(rows, "2")).toBeNull(); // 1,25 km/L
  });
});

describe("registros duplicados (caso R$ 1,57/km)", () => {
  const clean = [f("1", 1, 10000, 40, 6), f("2", 8, 10480, 40, 6), f("3", 15, 10960, 40, 6)];
  const withDuplicate = [...clean, { ...f("2", 8, 10480, 40, 6), id: "2b" }];

  it("antes: um duplicado dobrava os litros do trecho seguinte (12 → 6 km/L)", () => {
    // Reproduz o cálculo sem a proteção: 480 km ÷ 80 L.
    expect(480 / 80).toBe(6);
  });

  it("agora: o duplicado é sinalizado e fica fora do consumo e do custo", () => {
    const rows = computeFuelings(withDuplicate);
    expect(rows.find((r) => r.id === "2b")?.issue).toBe("duplicate");
    expect(kml(rows, "3")).toBeCloseTo(12);
    const o = overview(rows);
    expect(o.avgKmPerLiter).toBeCloseTo(12);
    expect(o.costPerKm).toBeCloseTo(0.5);
  });

  it("e também fora do gasto total", () => {
    const o = overview(computeFuelings(withDuplicate));
    expect(o.totalSpend).toBeCloseTo(720); // 3 × R$ 240, não 4
    expect(o.count).toBe(3);
    expect(o.duplicates).toBe(1);
  });

  it("km igual ao anterior com valores diferentes não é duplicado, é km inconsistente", () => {
    const rows = computeFuelings([
      f("1", 1, 10000, 40, 6),
      f("2", 8, 10480, 40, 6),
      f("3", 9, 10480, 5, 6, false),
      f("4", 15, 10960, 35, 6),
    ]);
    expect(rows.find((r) => r.id === "3")?.issue).toBe("odometer");
    // Os 5 L existiram: 480 km ÷ (5 + 35) L = 12 km/L.
    expect(kml(rows, "4")).toBeCloseTo(12);
  });
});

describe("trechos atípicos", () => {
  it("abastecimento não registrado (24 km/L num carro de 12) sai das médias", () => {
    const rows = computeFuelings([
      f("1", 1, 10000, 40, 6),
      f("2", 4, 10480, 40, 6),
      f("3", 7, 10960, 40, 6),
      f("4", 10, 11440, 40, 6),
      f("5", 17, 12400, 40, 6), // 960 km com 40 L: faltou registrar um tanque
    ]);
    const outlier = rows.find((r) => r.id === "5");
    expect(outlier?.issue).toBe("outlier");
    expect(outlier?.outlier_km_per_liter).toBeCloseTo(24);
    expect(overview(rows).avgKmPerLiter).toBeCloseTo(12);
    expect(overview(rows).outliers).toBe(1);
  });

  it("com poucos trechos não há padrão: nada é descartado", () => {
    const rows = computeFuelings([
      f("1", 1, 10000, 40, 6),
      f("2", 8, 10480, 40, 6),
      f("3", 15, 11440, 40, 6),
    ]);
    expect(rows.some((r) => r.issue === "outlier")).toBe(false);
  });
});

describe("carro flex", () => {
  const rows = computeFuelings([
    f("1", 1, 10000, 40, 6),
    f("2", 8, 10480, 40, 6), // gasolina: 12 km/L
    f("3", 15, 10800, 40, 4, true, "etanol"), // etanol: 8 km/L
    f("4", 22, 11120, 40, 4, true, "etanol"), // etanol: 8 km/L
  ]);
  const o = overview(rows);

  it("consumo médio usa só o combustível mais recente (não mistura 12 e 8)", () => {
    expect(o.fuelTypeId).toBe("etanol");
    expect(o.avgKmPerLiter).toBeCloseTo(8);
  });

  it("preço médio é ponderado pelo volume e só do combustível atual", () => {
    expect(o.avgPricePerLiter).toBeCloseTo(4);
  });

  it("custo por km soma todos os combustíveis: (R$ 240 + 160 + 160) ÷ 1.120 km", () => {
    // O primeiro tanque (R$ 240) só abre o trecho: não pertence a nenhum km medido.
    expect(o.costPerKm).toBeCloseTo(560 / 1120);
    expect(o.totalKm).toBe(1120);
  });
});

describe("preço médio ponderado × aritmético", () => {
  it("40 L a R$ 6 e 10 L a R$ 5 → R$ 5,80/L (aritmética daria R$ 5,50)", () => {
    const o = overview(computeFuelings([f("1", 1, 10000, 40, 6), f("2", 8, 10480, 10, 5)]));
    expect(o.avgPricePerLiter).toBeCloseTo(290 / 50);
  });
});

describe("TanqueIA: gasto nunca vira economia", () => {
  const rows = computeFuelings([
    f("1", 1, 10000, 40, 6),
    f("2", 8, 10480, 40, 6),
    f("3", 15, 10960, 40, 6),
  ]);
  const insights = buildInsights(overview(rows), savingsOpportunity(rows, [], null, null));
  const facts = insights.map((i) => `${i.title}: ${i.body}`);

  it("o fato de custo fala em gasto observado, nunca em economia", () => {
    const cost = insights.find((i) => i.id === "cost");
    expect(cost?.body).toMatch(/gasto observado/i);
    expect(facts.join(" ")).not.toMatch(/econom/i);
  });

  it("frase da IA que chama gasto de economia é recusada", () => {
    const bad = "Você pode economizar R$ 480,00 em 960 km, R$ 0,50 por km.";
    expect(numbersAreGrounded(bad, facts)).toBe(true); // os números batem…
    expect(checkPhrase(bad, facts)).toEqual({ ok: false, reason: "afirma economia sem base" });
  });

  it("frase fiel aos fatos é aceita (2.980 = 2.980,00)", () => {
    expect(
      checkPhrase("Você gastou R$ 2.980 em 1.900 km.", ["gastou R$ 2.980,00 em 1.900 km"]),
    ).toEqual({ ok: true });
  });

  it("número inventado ou previsão são recusados", () => {
    expect(checkPhrase("Você gastou R$ 500.", facts).ok).toBe(false);
    expect(checkPhrase("No próximo mês você vai gastar menos.", facts).ok).toBe(false);
  });

  it("registros problemáticos geram um aviso antes dos demais insights", () => {
    const dup = computeFuelings([
      f("1", 1, 10000, 40, 6),
      f("2", 8, 10480, 40, 6),
      { ...f("2", 8, 10480, 40, 6), id: "2b" },
    ]);
    const first = buildInsights(overview(dup), savingsOpportunity(dup, [], null, null))[0];
    expect(first.id).toBe("data-quality");
    expect(first.body).toMatch(/duplicado/);
  });
});
