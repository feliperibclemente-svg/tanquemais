import { describe, expect, it } from "vitest";
import { mapsDirectionsUrl, simulateTrip, tanksText } from "@/services/trip";

describe("simulação de viagem", () => {
  it("litros e custo a partir do consumo", () => {
    const r = simulateTrip({
      km: 500,
      roundTrip: false,
      kmPerLiter: 12.5,
      price: 5.9,
      tankLiters: 50,
    })!;
    expect(r.liters).toBeCloseTo(40);
    expect(r.cost).toBeCloseTo(236);
    expect(r.tanks).toBeCloseTo(0.8);
  });
  it("ida e volta dobra a distância; sem tanque cadastrado não estima tanques", () => {
    const r = simulateTrip({ km: 300, roundTrip: true, kmPerLiter: 10, price: 6 })!;
    expect(r.distance).toBe(600);
    expect(r.cost).toBeCloseTo(360);
    expect(r.tanks).toBeNull();
  });
  it("dados inválidos não geram resultado", () => {
    expect(simulateTrip({ km: 0, roundTrip: false, kmPerLiter: 10, price: 6 })).toBeNull();
    expect(simulateTrip({ km: 100, roundTrip: false, kmPerLiter: 0, price: 6 })).toBeNull();
    expect(simulateTrip({ km: 20_000, roundTrip: false, kmPerLiter: 10, price: 6 })).toBeNull();
  });
  it("texto de tanques e link do mapa", () => {
    expect(tanksText(0.8)).toBe("menos de 1 tanque cheio");
    expect(tanksText(1.4)).toBe("cerca de 1,5 tanque cheio");
    expect(tanksText(2.9)).toBe("cerca de 3 tanques cheios");
    expect(mapsDirectionsUrl("Caldas Novas, GO")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Caldas%20Novas%2C%20GO",
    );
  });
});
