import { describe, expect, it } from "vitest";
import {
  ageOn,
  ageRangeOf,
  checkBirthDate,
  firstNameOf,
  formatBirthDate,
  maskDate,
  needsIdentity,
  parseBirthDate,
  splitFullName,
  tidyName,
} from "@/services/identity";

const today = new Date(2026, 9, 15); // 15/10/2026

describe("data de nascimento", () => {
  it("máscara enquanto digita", () => {
    expect(maskDate("1")).toBe("1");
    expect(maskDate("1503")).toBe("15/03");
    expect(maskDate("15031990")).toBe("15/03/1990");
    expect(maskDate("15/03/19901")).toBe("15/03/1990");
  });
  it("rejeita datas que não existem", () => {
    expect(parseBirthDate("31/02/2000")).toBeNull();
    expect(parseBirthDate("15/13/2000")).toBeNull();
    expect(parseBirthDate("15/03/1990")).toBe("1990-03-15");
    expect(formatBirthDate("1990-03-15")).toBe("15/03/1990");
  });
  it("idade completa considera se já fez aniversário", () => {
    expect(ageOn("2008-10-15", today)).toBe(18); // faz 18 hoje
    expect(ageOn("2008-10-16", today)).toBe(17); // faz amanhã
  });
  it("aceita 18+ e bloqueia menores, datas futuras e implausíveis", () => {
    expect(checkBirthDate("15/10/2008", today)).toEqual({ ok: true, iso: "2008-10-15", age: 18 });
    expect(checkBirthDate("16/10/2008", today)).toEqual({ ok: false, reason: "minor" });
    expect(checkBirthDate("01/01/2030", today)).toEqual({ ok: false, reason: "future" });
    expect(checkBirthDate("01/01/1900", today)).toEqual({ ok: false, reason: "too-old" });
    expect(checkBirthDate("1/1/90", today)).toEqual({ ok: false, reason: "invalid" });
  });
  it("faixa etária derivada", () => {
    expect(ageRangeOf(18)).toBe("18-24");
    expect(ageRangeOf(34)).toBe("25-34");
    expect(ageRangeOf(60)).toBe("55+");
  });
});

describe("nome", () => {
  it("separa nome completo e escolhe o primeiro nome", () => {
    expect(splitFullName("  Ana  Paula Souza ")).toEqual({ first: "Ana", last: "Paula Souza" });
    expect(firstNameOf({ first_name: "Felipe", full_name: "X Y" })).toBe("Felipe");
    expect(firstNameOf({ first_name: null, full_name: "Maria Silva" })).toBe("Maria");
  });
  it("organiza maiúsculas preservando partículas", () => {
    expect(tidyName("  fELIPE  ribeiro DA silva ")).toBe("Felipe Ribeiro da Silva");
  });
});

describe("quando pedir os dados", () => {
  it("pede quando falta nome, sobrenome ou nascimento", () => {
    expect(needsIdentity({ first_name: "Ana", last_name: "Souza", birth_date: null })).toBe(true);
    expect(needsIdentity({ first_name: "Ana", last_name: "Souza", birth_date: "1990-01-01" })).toBe(
      false,
    );
  });
  it("não bloqueia se o banco ainda não tem as colunas", () => {
    expect(needsIdentity({ first_name: undefined } as never)).toBe(false);
    expect(needsIdentity(null)).toBe(false);
  });
});
