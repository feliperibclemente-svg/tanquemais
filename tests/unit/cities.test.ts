import { describe, expect, it } from "vitest";
import { officialCity, suggestCities } from "@/services/cities";

const GO = ["Abadiânia", "Anápolis", "Aparecida de Goiânia", "Goiânia", "Goianésia", "Rio Verde"];

describe("sugestões de cidade", () => {
  it("filtra pelo começo do nome, sem acento", () => {
    expect(suggestCities(GO, "a")).toEqual(["Abadiânia", "Anápolis", "Aparecida de Goiânia"]);
    expect(suggestCities(GO, "Apare")).toEqual(["Aparecida de Goiânia"]);
    expect(suggestCities(GO, "anapolis")).toEqual(["Anápolis"]);
  });
  it("depois do começo, palavras do meio do nome", () => {
    expect(suggestCities(GO, "goi")).toEqual(["Goiânia", "Goianésia", "Aparecida de Goiânia"]);
  });
  it("vazio não sugere nada e respeita o limite", () => {
    expect(suggestCities(GO, "  ")).toEqual([]);
    expect(suggestCities(GO, "a", 2)).toHaveLength(2);
  });
  it("acha o nome oficial do que foi digitado", () => {
    expect(officialCity(GO, "aparecida de goiania")).toBe("Aparecida de Goiânia");
    expect(officialCity(GO, "Cidade Nova")).toBeNull();
  });
});
