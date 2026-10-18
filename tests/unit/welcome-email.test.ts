import { describe, expect, it } from "vitest";
import { welcomeEmail } from "@/lib/welcome-email";

describe("e-mail de boas-vindas", () => {
  it("usa o primeiro nome, link do app e rodapé sem propaganda", () => {
    const e = welcomeEmail("Ana Paula");
    expect(e.subject).toBe("Boas-vindas ao Tanque+, Ana!");
    expect(e.html).toContain("Oi, Ana!");
    expect(e.html).toContain("https://www.tanquemais.com.br/app?source=email_boas_vindas");
    expect(e.text).toContain("Não enviamos propaganda");
    expect(e.html).not.toMatch(/econom|garant/i);
  });
  it("sem nome, saudação genérica", () => {
    expect(welcomeEmail(null).subject).toBe("Boas-vindas ao Tanque+!");
    expect(welcomeEmail("  ").html).toContain(">Oi!<");
  });
  it("nome não injeta HTML nem quebra o assunto", () => {
    const e = welcomeEmail('<img src=x onerror="alert(1)">');
    expect(e.html).not.toContain("<img");
    expect(welcomeEmail("Ana\r\nBcc: x@y.com").subject).toBe("Boas-vindas ao Tanque+, Ana!");
  });
});
