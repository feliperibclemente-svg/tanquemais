import { describe, expect, it } from "vitest";
import { estimatedCostPerKm } from "@/services/cost-estimate";

const now = new Date(2026, 9, 20, 12);
const r = (day: number, odometer: number, total: number, issue: string | null = null) => ({
  filled_at: new Date(2026, 9, day, 12).toISOString(),
  odometer,
  total_cost: total,
  issue: issue as never,
});

describe("custo por km estimado pelo km do painel", () => {
  it("combustível até o penúltimo ÷ km do primeiro ao último", () => {
    // moto: R$ 20 quase todo dia, ~110 km entre abastecimentos
    const e = estimatedCostPerKm(
      [r(14, 10000, 20), r(15, 10110, 20), r(16, 10220, 20), r(17, 10330, 20)],
      now,
    )!;
    expect(e.distance).toBe(330);
    expect(e.costPerKm).toBeCloseTo(60 / 330);
    expect(e.fuelings).toBe(4);
  });
  it("ignora duplicados e km inconsistente; ordem de chegada não importa", () => {
    const e = estimatedCostPerKm(
      [
        r(17, 10330, 20),
        r(14, 10000, 20),
        r(15, 10110, 20),
        r(15, 10110, 20, "duplicate"),
        r(16, 9000, 20, "odometer"),
      ],
      now,
    )!;
    expect(e.distance).toBe(330);
    expect(e.costPerKm).toBeCloseTo(40 / 330);
  });
  it("poucos dados não geram número", () => {
    expect(estimatedCostPerKm([r(14, 10000, 20), r(15, 10110, 20)], now)).toBeNull();
    expect(
      estimatedCostPerKm([r(14, 10000, 20), r(15, 10010, 20), r(16, 10020, 20)], now),
    ).toBeNull();
    const old = { ...r(1, 9000, 20), filled_at: new Date(2026, 5, 1).toISOString() };
    expect(estimatedCostPerKm([old, r(15, 10110, 20), r(16, 10220, 20)], now)).toBeNull();
  });
});
