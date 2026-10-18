import { describe, expect, it } from "vitest";
import { BRAND_FACTS, DRIVING_TIPS, teoNoteOfTheDay, tipsFor } from "@/content/teo-tips";
import { BRANDS } from "@/constants/vehicles";

describe("conteúdo do Teo", () => {
  it("toda marca do cadastro tem curiosidade, curta e sem promessa de economia", () => {
    for (const brand of BRANDS) expect(BRAND_FACTS[brand]?.length, brand).toBeGreaterThan(0);
    for (const text of [...Object.values(BRAND_FACTS).flat(), ...DRIVING_TIPS.map((t) => t.text)]) {
      expect(text.length, text).toBeLessThanOrEqual(170);
      expect(text, text).not.toMatch(/econom|garant|melhor marca|pior/i);
    }
  });
  it("moto não recebe dica de carro (porta-malas, câmbio, etanol)", () => {
    const moto = tipsFor("Yamaha").join(" ");
    expect(moto).not.toMatch(/porta-malas|carro manual|70%/);
    expect(moto).toMatch(/Corrente/);
    expect(tipsFor("Fiat").join(" ")).not.toMatch(/Corrente/);
  });
  it("alterna curiosidade e dica por dia e é estável no mesmo dia", () => {
    const d1 = teoNoteOfTheDay("Fiat", new Date(2026, 9, 18, 9));
    const d1b = teoNoteOfTheDay("Fiat", new Date(2026, 9, 18, 22));
    const d2 = teoNoteOfTheDay("Fiat", new Date(2026, 9, 19, 9));
    expect(d1).toEqual(d1b);
    expect(new Set([d1.kind, d2.kind])).toEqual(new Set(["curiosidade", "dica"]));
    const curiosity = d1.kind === "curiosidade" ? d1 : d2;
    expect(curiosity.title).toBe("Curiosidade sobre a Fiat");
  });
  it("marca fora do catálogo recebe só dicas", () => {
    for (let i = 0; i < 6; i += 1) {
      expect(teoNoteOfTheDay("Lada", new Date(2026, 9, 18 + i)).kind).toBe("dica");
    }
  });
});
