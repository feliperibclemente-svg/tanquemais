import { describe, expect, it } from "vitest";
import { friendlyError } from "@/lib/user-error";

const dbError = (code: string, message: string) => Object.assign(new Error(message), { code });

describe("mensagens de erro para a pessoa", () => {
  it("troca erros técnicos do banco por texto em português", () => {
    expect(
      friendlyError(
        dbError("42501", 'new row violates row-level security policy for table "fuelings"'),
      ),
    ).toBe("Não foi possível salvar: esse registro não pertence à sua conta.");
    expect(
      friendlyError(dbError("23514", 'new row for relation "vehicles" violates check constraint')),
    ).toMatch(/fora do permitido/);
    expect(
      friendlyError(dbError("PGRST116", "JSON object requested, multiple (or no) rows returned")),
    ).toBe("Não conseguimos concluir agora. Tente de novo em instantes.");
  });
  it("mantém mensagens das regras do banco (RAISE EXCEPTION)", () => {
    expect(friendlyError(dbError("P0001", "Você precisa ter 18 anos ou mais."))).toBe(
      "Você precisa ter 18 anos ou mais.",
    );
  });
  it("conexão caiu", () => {
    expect(friendlyError(new TypeError("Failed to fetch"))).toMatch(/Sem conexão/);
  });
  it("mantém mensagens do próprio app", () => {
    expect(friendlyError(new Error("Você já tem 5 veículos cadastrados."))).toBe(
      "Você já tem 5 veículos cadastrados.",
    );
  });
});
