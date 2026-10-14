import { describe, expect, it } from "vitest";
import { validateOdometer } from "@/services/analytics";
import { priceVerdict } from "@/services/verdict";

const at = (d: string) => new Date(`${d}T12:00:00`);
const row = (id: string, d: string, odometer: number) => ({ id, filled_at: at(d).toISOString(), odometer });

describe("validateOdometer", () => {
  const rows = [row("a", "2026-09-01", 1000), row("b", "2026-09-20", 1500)];
  it("km deve ser maior que o do registro anterior", () => {
    expect(validateOdometer(rows, at("2026-09-10"), 900)).toMatch(/maior/);
  });
  it("km deve ser menor que o do registro seguinte", () => {
    expect(validateOdometer(rows, at("2026-09-10"), 1600)).toMatch(/menor/);
  });
  it("km entre vizinhos é aceito", () => {
    expect(validateOdometer(rows, at("2026-09-10"), 1200)).toBeNull();
  });
});

describe("priceVerdict", () => {
  const ref = (id: string, d: string, price: number) =>
    ({ id, vehicle_id: "v", fuel_type_id: "gasolina", filled_at: at(d).toISOString(), price_per_liter: price }) as never;
  it("com 2 referências diz quantas faltam (precisa de 3)", () => {
    const v = priceVerdict([ref("1", "2026-09-10", 6), ref("2", "2026-09-05", 6)], {
      pricePerLiter: 5.5, liters: 40, fuelTypeId: "gasolina", vehicleId: "v", at: at("2026-09-15"),
    });
    expect(v.headline).toBe("Falta 1 de Gasolina para comparar");
  });
  it("com 3 referências compara", () => {
    const v = priceVerdict(
      [ref("1", "2026-09-10", 6), ref("2", "2026-09-05", 6), ref("3", "2026-09-01", 6)],
      { pricePerLiter: 5.5, liters: 40, fuelTypeId: "gasolina", vehicleId: "v", at: at("2026-09-15") },
    );
    expect(v.tone).toBe("good");
    expect(v.amount).toBeCloseTo(20);
  });
});
