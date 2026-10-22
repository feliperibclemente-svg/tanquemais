import { describe, expect, it } from "vitest";
import { parseStationSheet, stationFileUrl } from "@/services/anp-stations";

const week = { start: "2026-10-11", end: "2026-10-17" };

describe("parseStationSheet", () => {
  it("lê o layout com razão social, fantasia e endereço", () => {
    const { rows, headers } = parseStationSheet(
      [
        ["LEVANTAMENTO DE PREÇOS DE COMBUSTÍVEIS"],
        [],
        [
          "CNPJ",
          "RAZÃO",
          "FANTASIA",
          "ENDEREÇO",
          "NÚMERO",
          "COMPLEMENTO",
          "BAIRRO",
          "CEP",
          "MUNICÍPIO",
          "ESTADO",
          "BANDEIRA",
          "PRODUTO",
          "UNIDADE DE MEDIDA",
          "PREÇO DE REVENDA",
          "DATA DA COLETA",
        ],
        [
          "00.000.000/0001-91",
          "AUTO POSTO X LTDA",
          "POSTO AVENIDA",
          "AV T-63",
          "1200",
          "",
          "SETOR BUENO",
          "74000000",
          "GOIANIA",
          "GOIAS",
          "IPIRANGA",
          "GASOLINA COMUM",
          "R$/l",
          "6,49",
          "14/10/2026",
        ],
        [
          "11.111.111/0001-11",
          "COMERCIO Y SA",
          "",
          "RUA 10",
          "",
          "",
          "CENTRO",
          "",
          "GOIANIA",
          "GO",
          "BRANCA",
          "ETANOL HIDRATADO",
          "R$/l",
          4.19,
          46309,
        ],
        [
          "22.222.222/0001-22",
          "Z",
          "Z",
          "",
          "",
          "",
          "",
          "",
          "GOIANIA",
          "GO",
          "",
          "GLP",
          "R$/13kg",
          "110",
          "",
        ],
      ],
      week,
    );
    expect(headers).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      cnpj: "00000000000191",
      name: "Posto Avenida",
      address: "Av T-63, 1200",
      bairro: "Setor Bueno",
      brand: "Ipiranga",
      uf: "GO",
      municipio: "GOIANIA",
      fuel_type_id: "gasolina",
      price: 6.49,
      collected_on: "2026-10-14",
    });
    // Sem fantasia, usa a razão social; data como número de série do Excel.
    expect(rows[1]).toMatchObject({
      name: "Comercio Y Sa",
      fuel_type_id: "etanol",
      collected_on: "2026-10-14",
    });
  });

  it("lê o layout da série histórica (Revenda, Nome da Rua, Valor de Venda)", () => {
    const { rows } = parseStationSheet(
      [
        [
          "Regiao - Sigla",
          "Estado - Sigla",
          "Municipio",
          "Revenda",
          "CNPJ da Revenda",
          "Nome da Rua",
          "Numero Rua",
          "Bairro",
          "Produto",
          "Data da Coleta",
          "Valor de Venda",
          "Bandeira",
        ],
        [
          "CO",
          "GO",
          "GOIANIA",
          "POSTO W",
          "33.333.333/0001-33",
          "RUA 1",
          "10",
          "CENTRO",
          "DIESEL S10",
          "15/10/2026",
          "6,19",
          "VIBRA",
        ],
      ],
      week,
    );
    expect(rows).toEqual([
      expect.objectContaining({
        name: "Posto W",
        fuel_type_id: "diesel",
        price: 6.19,
        brand: "Vibra",
      }),
    ]);
  });

  it("sem as colunas essenciais, devolve os cabeçalhos para diagnóstico", () => {
    const { rows, headers } = parseStationSheet(
      [
        ["Posto", "Endereço", "Valor"],
        ["A", "B", "1"],
      ],
      week,
    );
    expect(rows).toEqual([]);
    expect(headers).toEqual(["Posto", "Endereço", "Valor"]);
  });

  it("deriva o arquivo por posto do arquivo de médias", () => {
    expect(stationFileUrl(".../2026/resumo_semanal_lpc_2026_10_11-2026_10_17.xlsx")).toBe(
      ".../2026/revendas_lpc_2026_10_11-2026_10_17.xlsx",
    );
  });
});
