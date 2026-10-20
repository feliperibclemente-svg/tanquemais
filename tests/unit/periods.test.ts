import { describe, expect, it } from "vitest";
import { inPeriod, periodRange, weekStart } from "@/services/periods";

// terça-feira, 20/10/2026
const now = new Date(2026, 9, 20, 15);
const at = (d: number, h = 12) => new Date(2026, 9, d, h).toISOString();

describe("períodos do histórico", () => {
  it("semana começa na segunda", () => {
    expect(weekStart(now).getDate()).toBe(19);
    expect(weekStart(new Date(2026, 9, 25, 10)).getDate()).toBe(19); // domingo
  });
  it("esta semana e semana passada (segunda a domingo)", () => {
    const week = periodRange("week", now);
    const last = periodRange("lastweek", now);
    expect(inPeriod(at(19, 0), week)).toBe(true);
    expect(inPeriod(at(18, 23), week)).toBe(false);
    expect(inPeriod(at(18, 23), last)).toBe(true);
    expect(inPeriod(at(12, 0), last)).toBe(true);
    expect(inPeriod(at(11, 23), last)).toBe(false);
    expect(inPeriod(at(19, 1), last)).toBe(false);
  });
  it("mês e tudo", () => {
    expect(inPeriod(at(1, 0), periodRange("month", now))).toBe(true);
    expect(inPeriod(new Date(2026, 8, 30).toISOString(), periodRange("month", now))).toBe(false);
    expect(inPeriod(at(1), periodRange("all", now))).toBe(true);
  });
});
