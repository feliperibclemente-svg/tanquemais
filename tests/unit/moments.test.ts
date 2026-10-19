import { describe, expect, it } from "vitest";
import { pickMoment } from "@/services/moments";

describe("cartão do momento", () => {
  it("mostra só o mais importante, na ordem de prioridade", () => {
    const pick = pickMoment(
      [
        { id: "checkup", key: "checkup:2026-10" },
        { id: "oil", key: "oil:50500:due" },
        null,
        { id: "price-week", key: "anp:2026-10-04:gasolina" },
      ],
      new Set(),
    );
    expect(pick?.id).toBe("oil");
  });
  it("dispensado só volta quando há novidade (chave nova)", () => {
    const candidates = [
      { id: "price-week" as const, key: "anp:2026-10-04:gasolina" },
      { id: "checkup" as const, key: "checkup:2026-10" },
    ];
    expect(pickMoment(candidates, new Set(["anp:2026-10-04:gasolina"]))?.id).toBe("checkup");
    expect(
      pickMoment(
        [{ id: "price-week", key: "anp:2026-10-11:gasolina" }],
        new Set(["anp:2026-10-04:gasolina"]),
      )?.id,
    ).toBe("price-week");
    expect(pickMoment([], new Set())).toBeNull();
  });
});
