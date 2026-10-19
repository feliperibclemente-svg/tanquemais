import { describe, expect, it } from "vitest";
import { scrub } from "@/lib/telemetry";

describe("scrub (registro de erros sem dados pessoais)", () => {
  it("remove e-mails, tokens e JWTs", () => {
    const text =
      "Falha para ana.souza+1@gmail.com em /app#access_token=abc123&x=1 auth eyJhbGc.eyJzdWIi.sig apikey=sb_secret_xyz";
    const out = scrub(text, 500)!;
    expect(out).not.toMatch(/ana\.souza|abc123|eyJhbGc|sb_secret_xyz/);
    expect(out).toContain("[email]");
    expect(out).toContain("access_token=[oculto]");
    expect(out).toContain("[jwt]");
  });
  it("corta no tamanho máximo e aceita vazio", () => {
    expect(scrub("a".repeat(600), 500)).toHaveLength(500);
    expect(scrub(undefined, 10)).toBeNull();
  });
});

describe("erros inofensivos", () => {
  it("reconhece código de versão antiga e avisos de recuperação do React", async () => {
    const { isStaleBuildError, isReactRecoverable } = await import("@/lib/telemetry");
    expect(
      isStaleBuildError(
        "Failed to fetch dynamically imported module: https://www.tanquemais.com.br/assets/auth-DsgJSW6w.js",
      ),
    ).toBe(true);
    expect(isStaleBuildError("Importing a module script failed.")).toBe(true);
    expect(isStaleBuildError("Cannot read properties of undefined")).toBe(false);
    expect(
      isReactRecoverable("Minified React error #422; visit https://react.dev/errors/422"),
    ).toBe(true);
    expect(isReactRecoverable("Minified React error #520; visit")).toBe(true);
    expect(isReactRecoverable("Minified React error #185; visit")).toBe(false);
  });
});
