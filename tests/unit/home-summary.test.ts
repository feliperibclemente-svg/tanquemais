import { describe, expect, it } from "vitest";
import { consumptionTrendText, homeCostPerKm } from "@/services/home-summary";

const oct = new Date(2026, 9, 18, 12).toISOString();

describe("tendência do consumo no Início", () => {
  it("compara o mês do último registro com o anterior", () => {
    expect(consumptionTrendText({ previous: 11.1, current: 10.4 }, oct, "Etanol")).toBe(
      "Consumo com etanol: 10,4 km/L em outubro e 11,1 km/L em setembro. Rendeu 6% menos.",
    );
    expect(consumptionTrendText({ previous: 10, current: 11 }, oct, "Gasolina")).toMatch(
      /Rendeu 10% mais\.$/,
    );
  });
  it("diferença pequena é praticamente igual", () => {
    expect(consumptionTrendText({ previous: 12, current: 12.2 }, oct, "Gasolina")).toMatch(
      /Praticamente igual\.$/,
    );
  });
  it("janeiro compara com dezembro", () => {
    const jan = new Date(2027, 0, 10, 12).toISOString();
    expect(consumptionTrendText({ previous: 12, current: 12 }, jan, "Gasolina")).toContain(
      "em janeiro e 12,0 km/L em dezembro",
    );
  });
  it("sem dado não mostra nada", () => {
    expect(consumptionTrendText(null, oct, "Gasolina")).toBeNull();
  });
});

describe("custo por km no Início", () => {
  it("usa o medido quando existe", () => {
    expect(homeCostPerKm({ costPerKm: 0.47 }, [])).toEqual({ value: 0.47, estimated: false });
  });
  it("sem medido e sem dados suficientes não mostra", () => {
    expect(homeCostPerKm({ costPerKm: null }, [])).toBeNull();
  });
});
