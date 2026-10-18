import { describe, expect, it } from "vitest";
import { computeFuelings, maxKmlFor } from "@/services/analytics";
import { BRANDS, fuelsFor, vehicleKind, vehicleName, vehicleWords } from "@/constants/vehicles";
import { FUEL_TYPES } from "@/constants/app";
import type { Fueling } from "@/types/domain";

/** Biz: 9 L entre dois tanques cheios e 405 km rodados = 45 km/L. */
const trip = (vehicleId: string) =>
  [
    { id: "1", day: 1, odometer: 10000 },
    { id: "2", day: 8, odometer: 10405 },
  ].map(
    (x) =>
      ({
        id: x.id,
        vehicle_id: vehicleId,
        fuel_type_id: "gasolina",
        filled_at: new Date(2026, 8, x.day, 12).toISOString(),
        odometer: x.odometer,
        liters: 9,
        price_per_liter: 6,
        total_cost: 54,
        full_tank: true,
      }) as Fueling,
  );

describe("motos", () => {
  it("moto a 45 km/L entra no consumo; carro a 45 km/L é descartado (km digitado errado)", () => {
    const moto = computeFuelings(trip("m"), [{ id: "m", brand: "Honda Motos" }]);
    expect(moto.find((r) => r.id === "2")?.computed_km_per_liter).toBe(45);
    const carro = computeFuelings(trip("c"), [{ id: "c", brand: "Fiat" }]);
    expect(carro.find((r) => r.id === "2")?.computed_km_per_liter).toBeNull();
  });
  it("marca fora do catálogo pode ser moto: teto maior", () => {
    expect(maxKmlFor("Lifan")).toBe(80);
    expect(maxKmlFor("Fiat")).toBe(40);
  });
  it("texto se adapta: carro, moto ou veículo", () => {
    expect(vehicleKind("yamaha")).toBe("moto");
    expect(vehicleWords("Yamaha").your).toBe("sua moto");
    expect(vehicleWords("Fiat").your).toBe("seu carro");
    expect(vehicleWords("Lifan").your).toBe("seu veículo");
    expect(vehicleWords(null).ofThe).toBe("do veículo");
  });
  it('nome sem o sufixo "Motos" e sem diesel/GNV para moto', () => {
    expect(vehicleName({ brand: "Honda Motos", model: "Biz 125" })).toBe("Honda Biz 125");
    expect(vehicleName({ nickname: "Bizinha", brand: "Honda Motos", model: "Biz 125" })).toBe(
      "Bizinha",
    );
    const ids = (b: string) => fuelsFor(b, FUEL_TYPES).map((f) => f.id);
    expect(ids("Yamaha")).not.toContain("diesel");
    expect(ids("Yamaha")).not.toContain("gnv");
    expect(ids("Fiat")).toContain("diesel");
  });
  it("catálogo sem marca repetida", () => {
    expect(new Set(BRANDS).size).toBe(BRANDS.length);
  });
});
