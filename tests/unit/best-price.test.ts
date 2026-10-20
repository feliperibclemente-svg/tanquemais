import { describe, expect, it } from "vitest";
import { bestPricesByFuel, recentStations } from "@/services/best-price";

const now = new Date(2026, 9, 20, 12);
const day = (d: number) => new Date(2026, 9, d, 12).toISOString();
const r = (id: string, fuel: string, price: number, d: number, station: string | null = null) => ({
  id,
  fuel_type_id: fuel,
  price_per_liter: price,
  filled_at: day(d),
  issue: null,
  station_name: station,
});

describe("onde você pagou menos", () => {
  it("menor preço por litro, por combustível, com o posto quando informado", () => {
    const out = bestPricesByFuel(
      [
        r("1", "gasolina", 6.19, 1, "Posto A"),
        r("2", "gasolina", 5.89, 8, "Posto B"),
        r("3", "gasolina", 6.05, 15),
        r("4", "etanol", 4.1, 10),
        r("5", "etanol", 3.99, 18),
      ],
      now,
    );
    expect(out.map((b) => [b.fuelTypeId, b.price, b.stationName, b.compared])).toEqual([
      ["gasolina", 5.89, "Posto B", 3],
      ["etanol", 3.99, null, 2],
    ]);
  });
  it("não confunde preço por litro com valor total e ignora duplicados", () => {
    const rows = [
      { ...r("1", "gasolina", 6.0, 5), total_cost: 50 },
      { ...r("2", "gasolina", 5.5, 6), issue: "duplicate" as const },
      { ...r("3", "gasolina", 5.8, 7), total_cost: 300 },
    ];
    expect(bestPricesByFuel(rows, now)[0].fuelingId).toBe("3");
  });
  it("precisa de 2 abastecimentos do combustível e só olha 90 dias", () => {
    expect(bestPricesByFuel([r("1", "gasolina", 5.0, 5)], now)).toEqual([]);
    const old = { ...r("1", "gasolina", 4.0, 1), filled_at: new Date(2026, 5, 1).toISOString() };
    expect(
      bestPricesByFuel([old, r("2", "gasolina", 6, 5), r("3", "gasolina", 6.1, 6)], now)[0].price,
    ).toBe(6);
  });
  it("postos recentes sem repetir (maiúsculas não importam)", () => {
    expect(
      recentStations([
        r("1", "gasolina", 6, 1, "Posto A"),
        r("2", "gasolina", 6, 3, "posto a"),
        r("3", "gasolina", 6, 2, "Posto B"),
        r("4", "gasolina", 6, 4, " "),
      ]),
    ).toEqual(["posto a", "Posto B"]);
  });
});
