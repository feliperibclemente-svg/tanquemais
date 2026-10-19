import { describe, expect, it } from "vitest";
import { inviteMessage } from "@/lib/invite";

describe("convite", () => {
  it("mensagem curta, com o endereço do app e sem promessa de economia em valor", () => {
    const m = inviteMessage();
    expect(m).toContain("tanquemais.com.br");
    expect(m).toContain("grátis");
    expect(m.length).toBeLessThan(200);
    expect(m).not.toMatch(/R\$|economiz/i);
  });
});
