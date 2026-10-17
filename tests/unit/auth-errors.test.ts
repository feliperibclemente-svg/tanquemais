import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

describe("authErrorMessage", () => {
  it.each([
    ["Invalid login credentials", "E-mail ou senha incorretos."],
    ["Email not confirmed", "Confirme seu e-mail"],
    ["User already registered", "já tem conta"],
    ["email rate limit exceeded", "Muitas tentativas"],
    ["For security purposes, you can only request this after 42 seconds.", "Muitas tentativas"],
    ["Password should be at least 8 characters.", "senha mais forte"],
    ["New password should be different from the old password.", "diferente da anterior"],
    ["Email link is invalid or has expired", "expirou"],
    ["Failed to fetch", "Sem conexão"],
    ["something unexpected", "Tente novamente"],
  ])("%s", (input, expected) => {
    expect(authErrorMessage(input)).toContain(expected);
  });

  it("aceita vazio", () => {
    expect(authErrorMessage(undefined)).toContain("Tente novamente");
  });
});
