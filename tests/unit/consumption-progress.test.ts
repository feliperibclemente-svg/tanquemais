import { describe, expect, it } from "vitest";
import { consumptionProgress, consumptionProgressText } from "@/services/analytics";
import { buildInsights } from "@/services/insights";
import type { Overview, SavingsOpportunity } from "@/services/analytics";

const row = (full_tank: boolean, odometer: number, issue: "duplicate" | null = null) => ({
  full_tank,
  odometer,
  issue,
});

describe("consumptionProgress", () => {
  it("com consumo medido está pronto", () => {
    expect(consumptionProgress([row(true, 1), row(true, 2)], 12.4)).toEqual({ state: "ready" });
  });
  it("sem tanque cheio faltam 2", () => {
    expect(consumptionProgress([row(false, 1000)], null)).toEqual({
      state: "pending",
      fullTanks: 0,
      missing: 2,
    });
    expect(consumptionProgress([], null)).toMatchObject({ missing: 2 });
  });
  it("tanque cheio sem km não conta", () => {
    expect(consumptionProgress([row(true, 0)], null)).toMatchObject({ missing: 2 });
  });
  it("um tanque cheio: falta 1", () => {
    expect(consumptionProgress([row(true, 1000), row(false, 1200)], null)).toEqual({
      state: "pending",
      fullTanks: 1,
      missing: 1,
    });
  });
  it("duplicado não conta como segundo tanque cheio", () => {
    expect(
      consumptionProgress([row(true, 1000), row(true, 1000, "duplicate")], null),
    ).toMatchObject({ missing: 1 });
  });
  it("dois tanques cheios sem trecho válido: aguardando novo trecho, não 'falta 1'", () => {
    const p = consumptionProgress([row(true, 1000), row(true, 900)], null);
    expect(p).toEqual({ state: "waiting" });
    expect(consumptionProgressText(p)).toContain("próximo abastecimento");
    expect(consumptionProgressText(p, "short")).not.toContain("Falta");
  });
  it("textos curtos e longos", () => {
    expect(consumptionProgressText({ state: "pending", fullTanks: 0, missing: 2 }, "short")).toBe(
      "Faltam 2 tanques cheios",
    );
    expect(consumptionProgressText({ state: "pending", fullTanks: 1, missing: 1 })).toContain(
      "Complete o tanque no próximo",
    );
  });
});

describe("insight inicial", () => {
  const savings = {} as SavingsOpportunity;
  const base = { count: 0 } as Overview;
  it("sem registros não promete recomendação genérica", () => {
    const [i] = buildInsights(base, savings);
    expect(i.id).toBe("empty");
    expect(i.body).toContain("dois tanques cheios");
    expect(i.body).not.toContain("recomendações personalizadas");
  });
  it("com 1 registro reconhece o primeiro", () => {
    const [i] = buildInsights({ ...base, count: 1 }, savings);
    expect(i.body).toContain("primeiro registro");
  });
});
