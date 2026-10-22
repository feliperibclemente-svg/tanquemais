import { describe, expect, it } from "vitest";
import { cityWeek, cityWeekLines } from "@/services/city-week";

const row = (
  week: string,
  fuel: string,
  avg: number,
  extra: Partial<{ scope: string; municipio: string; min: number; max: number }> = {},
) => {
  const end = new Date(Date.parse(`${week}T12:00:00`) + 6 * 86_400_000).toISOString().slice(0, 10);
  return {
    scope: extra.scope ?? "municipio",
    uf: "GO",
    municipio: extra.scope === "estado" ? "" : (extra.municipio ?? "GOIANIA"),
    municipio_label: "Goiania",
    fuel_type_id: fuel,
    avg_price: avg,
    min_price: extra.min ?? null,
    max_price: extra.max ?? null,
    week_start: week,
    week_end: end,
    stations: 44,
  };
};
const place = { uf: "GO", city: "Goiânia" };
const now = new Date("2026-10-20T12:00:00");

describe("cityWeek", () => {
  const refs = [
    row("2026-10-04", "gasolina", 6.67),
    row("2026-10-11", "gasolina", 6.75, { min: 6.49, max: 7.09 }),
    row("2026-10-11", "etanol", 4.39),
    row("2026-10-04", "etanol", 4.42),
  ];

  it("calcula variação, razão do etanol e diferença entre postos", () => {
    const cw = cityWeek(refs, place, "gasolina", now)!;
    expect(cw.ref.place).toBe("Goiânia");
    expect(cw.change).toBe(0.08);
    expect(cw.ethanolRatio).toBeCloseTo(4.39 / 6.75);
    expect(cw.spread).toBe(0.6);
  });

  it("monta frases sem prometer economia", () => {
    const lines = cityWeekLines(cityWeek(refs, place, "gasolina", now)!, 48);
    expect(lines[0]).toMatch(
      /^Gasolina comum: R\$\s6,75\/L, R\$\s0,08 a mais que na semana passada\.$/,
    );
    expect(lines[1]).toBe("Etanol a 65% da gasolina: o etanol compensa (regra dos 70%).");
    expect(lines[2]).toMatch(/: R\$\s0,60\/L, cerca de R\$\s29 no seu tanque de 48\sL\.$/);
  });

  it("sem semana anterior, sem min/max e sem tanque, mostra só o que existe", () => {
    const cw = cityWeek([row("2026-10-11", "gasolina", 6.75)], place, "gasolina", now)!;
    expect(cw.change).toBeNull();
    expect(cw.ethanolRatio).toBeNull();
    expect(cw.spread).toBeNull();
    expect(cityWeekLines(cw, null)).toHaveLength(1);
  });

  it("não compara semanas muito distantes nem lugares diferentes", () => {
    const far = cityWeek(
      [row("2026-09-20", "gasolina", 6.5), row("2026-10-11", "gasolina", 6.75)],
      place,
      "gasolina",
      now,
    )!;
    expect(far.change).toBeNull();
    const mixed = cityWeek(
      [
        row("2026-10-04", "gasolina", 6.5, { scope: "estado" }),
        row("2026-10-11", "gasolina", 6.75),
      ],
      place,
      "gasolina",
      now,
    )!;
    expect(mixed.change).toBeNull();
  });

  it("diesel não recebe a comparação do etanol; sem tanque, sem conta do tanque", () => {
    const cw = cityWeek(
      [...refs, row("2026-10-11", "diesel", 6.2, { min: 5.99, max: 6.49 })],
      place,
      "diesel",
      now,
    )!;
    expect(cw.ethanolRatio).toBeNull();
    const lines = cityWeekLines(cw, null);
    expect(lines.at(-1)).toMatch(/: R\$\s0,50\/L\.$/);
  });

  it("gasolina mais vantajosa quando o etanol passa de 70%", () => {
    const cw = cityWeek(
      [row("2026-10-11", "gasolina", 6.0), row("2026-10-11", "etanol", 4.5)],
      place,
      "etanol",
      now,
    )!;
    expect(cityWeekLines(cw, 50)[1]).toBe(
      "Etanol a 75% da gasolina: a gasolina compensa (regra dos 70%).",
    );
  });
});
