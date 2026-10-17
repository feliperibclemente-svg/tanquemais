import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseReference,
  normalizeName,
  parseReferenceSheet,
  toFuelTypeId,
  toNumber,
  toUf,
  weekFromFileName,
  weekLabel,
} from "@/services/anp";
import { readXlsx } from "@/lib/xlsx-lite.server";
import { rowsFromWorkbook } from "@/lib/anp-import.server";
import { buildInsights, cityPriceInsight } from "@/services/insights";
import type { Overview, SavingsOpportunity } from "@/services/analytics";

const week = { start: "2026-10-04", end: "2026-10-10" };

describe("normalização", () => {
  it("nomes, UF, produtos e números", () => {
    expect(normalizeName(" São José  dos Campos ")).toBe("SAO JOSE DOS CAMPOS");
    expect(toUf("SÃO PAULO")).toBe("SP");
    expect(toUf("sp")).toBe("SP");
    expect(toUf("XX")).toBeNull();
    expect(toFuelTypeId("GASOLINA COMUM")).toBe("gasolina");
    expect(toFuelTypeId("ETANOL HIDRATADO")).toBe("etanol");
    expect(toFuelTypeId("ÓLEO DIESEL S10")).toBe("diesel");
    expect(toFuelTypeId("OLEO DIESEL")).toBeNull();
    expect(toFuelTypeId("GLP")).toBeNull();
    expect(toNumber("6,15")).toBe(6.15);
    expect(toNumber("1.234,50")).toBe(1234.5);
    expect(toNumber(6.15)).toBe(6.15);
    expect(toNumber("-")).toBeNull();
  });
  it("semana pelo nome do arquivo", () => {
    expect(weekFromFileName(".../2026/resumo_semanal_lpc_2026-10-04_2026-10-10.xlsx")).toEqual(
      week,
    );
    expect(weekLabel(week.start, week.end)).toBe("04/10 a 10/10");
  });
});

describe("leitura da planilha", () => {
  it("encontra o cabeçalho em qualquer linha e ignora produtos fora do app", () => {
    const rows = [
      ["ANP"],
      [],
      ["ESTADO", "MUNICÍPIO", "PRODUTO", "NÚMERO DE POSTOS PESQUISADOS", "PREÇO MÉDIO REVENDA"],
      ["SAO PAULO", "CAMPINAS", "GASOLINA COMUM", 20, "6,15"],
      ["SAO PAULO", "CAMPINAS", "GLP", 10, 110],
      ["SAO PAULO", "CAMPINAS", "ETANOL HIDRATADO", 18, 99], // absurdo: fora
      ["TERRA", "X", "GASOLINA COMUM", 1, 6], // UF inválida: fora
    ];
    const out = parseReferenceSheet(rows, "municipio", week);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      uf: "SP",
      municipio: "CAMPINAS",
      municipio_label: "Campinas",
      fuel_type_id: "gasolina",
      avg_price: 6.15,
      stations: 20,
    });
  });
  it("sem cabeçalho reconhecível não devolve nada", () => {
    expect(
      parseReferenceSheet(
        [
          ["A", "B"],
          [1, 2],
        ],
        "estado",
        week,
      ),
    ).toEqual([]);
  });
  it("lê um .xlsx de verdade (abas, textos compartilhados e números)", () => {
    const sheets = readXlsx(readFileSync("tests/fixtures/anp-resumo-exemplo.xlsx"));
    expect(Object.keys(sheets)).toEqual(["BRASIL", "ESTADOS", "MUNICIPIOS"]);
    const rows = rowsFromWorkbook(sheets, week);
    const municipios = rows.filter((r) => r.scope === "municipio");
    const estados = rows.filter((r) => r.scope === "estado");
    expect(municipios).toHaveLength(126); // 63 cidades × gasolina e etanol (diesel comum fica fora)
    expect(estados.map((r) => r.fuel_type_id).sort()).toEqual(["diesel", "etanol", "gasolina"]);
    expect(municipios.find((r) => r.municipio === "SAO JOSE DOS CAMPOS")?.municipio_label).toBe(
      "Sao Jose dos Campos",
    );
  });
});

describe("escolha da referência", () => {
  const ref = (over: Partial<Parameters<typeof chooseReference>[0][number]>) => ({
    scope: "municipio" as const,
    uf: "SP",
    municipio: "CAMPINAS",
    municipio_label: "Campinas",
    fuel_type_id: "gasolina",
    avg_price: 6.15,
    week_start: "2026-10-04",
    week_end: "2026-10-10",
    stations: 20,
    ...over,
  });
  const refs = [
    ref({}),
    ref({ week_start: "2026-09-27", week_end: "2026-10-03", avg_price: 6.05 }),
    ref({ scope: "estado", municipio: "", municipio_label: null, avg_price: 6.11 }),
  ];
  it("usa a cidade e a semana mais recente até a data do abastecimento", () => {
    expect(
      chooseReference(refs, { uf: "SP", city: "campinas" }, "gasolina", "2026-10-12T12:00:00"),
    ).toMatchObject({
      scope: "municipio",
      place: "Campinas",
      avgPrice: 6.15,
      weekStart: "2026-10-04",
    });
    expect(
      chooseReference(refs, { uf: "SP", city: "Campinas" }, "gasolina", "2026-10-01T12:00:00"),
    ).toMatchObject({
      avgPrice: 6.05,
    });
  });
  it("mostra a cidade com acento, como a pessoa digitou", () => {
    const sp = [ref({ municipio: "SAO PAULO", municipio_label: "Sao Paulo" })];
    expect(
      chooseReference(sp, { uf: "SP", city: "são paulo" }, "gasolina", "2026-10-12")?.place,
    ).toBe("São Paulo");
  });
  it("cidade fora da pesquisa usa o estado", () => {
    expect(
      chooseReference(refs, { uf: "SP", city: "Holambra" }, "gasolina", "2026-10-12"),
    ).toMatchObject({
      scope: "estado",
      place: "SP",
      avgPrice: 6.11,
    });
  });
  it("sem UF, outro combustível ou referência velha: nada", () => {
    expect(
      chooseReference(refs, { uf: null, city: "Campinas" }, "gasolina", "2026-10-12"),
    ).toBeNull();
    expect(
      chooseReference(refs, { uf: "SP", city: "Campinas" }, "etanol", "2026-10-12"),
    ).toBeNull();
    expect(
      chooseReference(refs, { uf: "SP", city: "Campinas" }, "gasolina", "2026-12-01"),
    ).toBeNull();
  });
});

describe("insight da média da ANP", () => {
  const reference = {
    scope: "municipio" as const,
    place: "Campinas",
    avgPrice: 6.15,
    weekStart: "2026-10-04",
    weekEnd: "2026-10-10",
    stations: 20,
  };
  it("frase neutra, com fonte e semana", () => {
    const i = cityPriceInsight({ reference, paid: 6.29 });
    expect(i.body).toContain("segundo a ANP");
    expect(i.body).toContain("04/10 a 10/10");
    expect(i.body).toContain("acima da média de Campinas");
    expect(i.body).not.toMatch(/econom/i);
  });
  it("já aparece no primeiro abastecimento", () => {
    const [first] = buildInsights({ count: 1 } as Overview, {} as SavingsOpportunity, {
      reference,
      paid: 6.0,
    });
    expect(first.id).toBe("city-price");
    expect(first.body).toContain("abaixo da média");
  });
});

describe("planilha real da ANP (semana 04/10 a 10/10/2026)", () => {
  const sheets = readXlsx(readFileSync("tests/fixtures/anp-resumo-2026-10-04.xlsx"));
  const rows = rowsFromWorkbook(sheets, week);
  const municipios = rows.filter((r) => r.scope === "municipio");
  const estados = rows.filter((r) => r.scope === "estado");

  it("lê as abas de municípios e estados (capitais, regiões e Brasil ficam de fora)", () => {
    expect(Object.keys(sheets)).toEqual(["CAPITAIS", "MUNICIPIOS", "ESTADOS", "REGIOES", "BRASIL"]);
    expect(municipios.length).toBeGreaterThan(1500);
    expect(new Set(estados.map((r) => r.uf)).size).toBe(27);
  });
  it("valores conferem com a planilha", () => {
    expect(
      municipios.find((r) => r.municipio === "ADAMANTINA" && r.fuel_type_id === "etanol"),
    ).toMatchObject({ uf: "SP", avg_price: 3.39, stations: 8, municipio_label: "Adamantina" });
    expect(estados.find((r) => r.uf === "AC" && r.fuel_type_id === "etanol")).toMatchObject({
      avg_price: 4.84,
      stations: 9,
    });
  });
  it("óleo diesel comum (S500) e GLP não entram; diesel S10 entra", () => {
    const fuels = new Set(rows.map((r) => r.fuel_type_id));
    expect([...fuels].sort()).toEqual([
      "diesel",
      "etanol",
      "gasolina",
      "gasolina_aditivada",
      "gnv",
    ]);
    expect(rows.every((r) => r.avg_price > 0.5 && r.avg_price < 30)).toBe(true);
  });
});
