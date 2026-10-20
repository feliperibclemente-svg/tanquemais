import { describe, expect, it } from "vitest";
import { computeFuelings } from "@/services/analytics";
import { buildMonthlyRecap, localMonthKey, recapMonthFor } from "@/services/recap";
import type { Fueling } from "@/types/domain";

/** Outubro/2026: 4 tanques cheios de 40 L a R$ 6, 6,10, 5,90, 6,20; 480 km por trecho. */
const f = (id: string, day: number, odometer: number, price: number, month = 9): Fueling =>
  ({
    id,
    vehicle_id: "v1",
    fuel_type_id: "gasolina",
    filled_at: new Date(2026, month, day, 12).toISOString(),
    odometer,
    liters: 40,
    price_per_liter: price,
    total_cost: 40 * price,
    full_tank: true,
  }) as Fueling;

const rows = computeFuelings([
  f("1", 2, 10000, 6.0),
  f("2", 9, 10480, 6.1),
  f("3", 16, 10960, 5.9),
  f("4", 23, 11440, 6.2),
]);

describe("retrospectiva do mês", () => {
  it("escolhe o mês: anterior no começo do mês, atual 'até agora' depois", () => {
    expect(recapMonthFor(rows, new Date(2026, 10, 3))).toEqual({ key: "2026-10", partial: false });
    expect(recapMonthFor(rows, new Date(2026, 9, 25))).toEqual({ key: "2026-10", partial: true });
    expect(recapMonthFor([], new Date(2026, 9, 25))).toBeNull();
  });
  it("gasto, consumo real, custo por km e melhor preço", () => {
    const r = buildMonthlyRecap({ rows, key: "2026-10", partial: false, vehicleYour: "Seu Argo" });
    expect(r.slides.map((s) => s.id)).toEqual([
      "abertura",
      "gasto",
      "consumo",
      "custo-km",
      "melhor-preco",
      "resumo",
    ]);
    const gasto = r.slides.find((s) => s.id === "gasto")!;
    expect(gasto.big).toMatch(/R\$\s968/); // 40 × (6 + 6,1 + 5,9 + 6,2)
    expect(gasto.title).toBe("em 4 abastecimentos");
    expect(r.slides.find((s) => s.id === "consumo")!.big).toBe("12,0 km/L"); // 1440 km ÷ 120 L
    expect(r.slides.find((s) => s.id === "melhor-preco")!.big).toMatch(/5,90/);
    expect(r.summary.map((x) => x.label)).toContain("Custo por km");
  });
  it("melhor preço compara só o mesmo combustível (etanol não 'vence' a gasolina)", () => {
    const eth = { ...f("5", 25, 11900, 4.2), fuel_type_id: "etanol" } as Fueling;
    const mixed = computeFuelings([
      f("1", 2, 10000, 6.0),
      f("2", 9, 10480, 6.1),
      f("3", 16, 10960, 5.9),
      eth,
    ]);
    const r = buildMonthlyRecap({
      rows: mixed,
      key: "2026-10",
      partial: false,
      vehicleYour: "Seu Argo",
    });
    const best = r.slides.find((s) => s.id === "melhor-preco")!;
    expect(best.big).toMatch(/5,90/);
    expect(best.eyebrow).toContain("gasolina");
    expect(r.summary.find((x) => x.label.startsWith("Melhor preço"))!.label).toBe(
      "Melhor preço (Gasolina)",
    );
  });
  it("compara com a média da cidade quando há referência da ANP", () => {
    const refs = [
      {
        scope: "municipio",
        uf: "SP",
        municipio: "CAMPINAS",
        municipio_label: "Campinas",
        fuel_type_id: "gasolina",
        avg_price: 6.05,
        week_start: "2026-09-27",
        week_end: "2026-10-03",
        stations: 20,
      },
    ];
    const r = buildMonthlyRecap({
      rows,
      key: "2026-10",
      partial: false,
      vehicleYour: "Seu Argo",
      references: refs,
      place: { uf: "SP", city: "Campinas" },
    });
    const cidade = r.slides.find((s) => s.id === "cidade")!;
    // A média da semana 27/09 vale por até 3 semanas: o abastecimento do dia 23 fica de fora.
    expect(cidade.big).toBe("2 de 3"); // 6,00 e 5,90 abaixo de 6,05; 6,10 acima
    expect(cidade.eyebrow).toBe("Comparado com a média de Campinas");
  });
  it("sem dados de consumo, não inventa tela", () => {
    const one = computeFuelings([f("1", 2, 10000, 6.0)]);
    const r = buildMonthlyRecap({
      rows: one,
      key: "2026-10",
      partial: true,
      vehicleYour: "Seu Argo",
    });
    expect(r.slides.map((s) => s.id)).toEqual(["abertura", "gasto"]);
    expect(localMonthKey(new Date(2026, 0, 31, 23))).toBe("2026-01");
  });
});

describe("texto da imagem compartilhada", () => {
  it("vira primeira pessoa", async () => {
    const { toFirstPerson } = await import("@/lib/share-image");
    expect(toFirstPerson("Seu Argo fez isso de verdade")).toBe("Meu Argo fez isso de verdade");
    expect(toFirstPerson("Sua Biz fez isso de verdade")).toBe("Minha Biz fez isso de verdade");
    expect(toFirstPerson("Consumo real, medido por você")).toBe("Consumo real, medido por mim");
  });
});
