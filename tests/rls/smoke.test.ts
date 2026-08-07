/**
 * Smoke de RLS — rápido, roda em todo pull request.
 *
 * Cobre apenas os invariantes críticos (o que nunca pode regredir):
 * catálogo público legível, identidade de quem reportou preços bloqueada,
 * grafo social e dados pessoais inacessíveis para anon.
 * A suíte completa (anon.test.ts + authenticated.test.ts) roda semanalmente.
 */
import { describe, expect, it } from "vitest";
import { ANON_KEY, SUPABASE_URL, isPermissionDenied, restSelect, rows } from "./helpers";

describe("smoke de RLS", () => {
  it("ambiente configurado", () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(ANON_KEY).toBeTruthy();
  });

  it("catálogo público continua legível", async () => {
    const result = await restSelect("stations", "id,name");
    expect(result.status).toBe(200);
  });

  it("preços são públicos sem identificar quem reportou", async () => {
    expect((await restSelect("station_prices", "station_id,price")).status).toBe(200);
    expect(isPermissionDenied(await restSelect("station_prices", "reported_by"))).toBe(true);
    expect(isPermissionDenied(await restSelect("price_history", "reported_by"))).toBe(true);
  });

  it("grafo social é bloqueado para visitantes", async () => {
    for (const table of ["club_members", "followers"]) {
      expect(isPermissionDenied(await restSelect(table, "*"))).toBe(true);
    }
  });

  it("dados pessoais não vazam para visitantes", async () => {
    for (const table of ["profiles", "vehicles", "fuelings", "feedback"]) {
      const result = await restSelect(table, "*");
      expect(isPermissionDenied(result) || rows(result).length === 0).toBe(true);
    }
  });
});
