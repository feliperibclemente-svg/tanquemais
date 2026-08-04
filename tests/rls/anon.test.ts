/**
 * Visitante não autenticado (anon).
 *
 * Congela o contrato: o que é público de fato, o que é bloqueado e quais
 * colunas sensíveis continuam invisíveis mesmo em tabelas públicas.
 */
import { describe, expect, it } from "vitest";
import { ANON_KEY, SUPABASE_URL, isPermissionDenied, restSelect, rows } from "./helpers";

describe("leitura anônima (anon)", () => {
  it("ambiente configurado", () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(ANON_KEY).toBeTruthy();
  });

  describe("catálogo público continua legível", () => {
    for (const table of ["stations", "fuel_types", "badges", "missions", "clubs"]) {
      it(`${table} é legível`, async () => {
        const result = await restSelect(table, "*");
        expect(result.status).toBe(200);
        expect(Array.isArray(result.body)).toBe(true);
      });
    }
  });

  describe("preços são públicos, mas sem identificar quem reportou", () => {
    it("colunas de preço são legíveis", async () => {
      const result = await restSelect("station_prices", "station_id,fuel_type_id,price,reported_at");
      expect(result.status).toBe(200);
      expect(Array.isArray(result.body)).toBe(true);
    });

    it("station_prices.reported_by é bloqueado", async () => {
      expect(isPermissionDenied(await restSelect("station_prices", "reported_by"))).toBe(true);
    });

    it("station_prices.* (que incluiria reported_by) é bloqueado", async () => {
      expect(isPermissionDenied(await restSelect("station_prices", "*"))).toBe(true);
    });

    it("price_history.reported_by é bloqueado", async () => {
      expect(isPermissionDenied(await restSelect("price_history", "reported_by"))).toBe(true);
    });

    it("price_history.* é bloqueado", async () => {
      expect(isPermissionDenied(await restSelect("price_history", "*"))).toBe(true);
    });
  });

  describe("grafo social não é exposto a visitantes", () => {
    for (const table of ["club_members", "followers"]) {
      it(`${table} é bloqueado`, async () => {
        expect(isPermissionDenied(await restSelect(table, "*"))).toBe(true);
      });
    }

    for (const table of ["posts", "comments"]) {
      it(`${table} não retorna conteúdo social para anon`, async () => {
        const result = await restSelect(table, "id");
        // Ou nega o acesso, ou devolve lista vazia — nunca conteúdo de usuários.
        expect(isPermissionDenied(result) || rows(result).length === 0).toBe(true);
      });
    }
  });

  describe("dados pessoais nunca vazam para anon", () => {
    const personal = [
      "profiles",
      "vehicles",
      "fuelings",
      "feedback",
      "notifications",
      "ai_insights",
      "mission_progress",
      "favorites",
      "user_roles",
      "user_statistics",
      "vehicle_statistics",
      "user_badges",
      "likes",
    ];

    for (const table of personal) {
      it(`${table} não devolve nenhuma linha`, async () => {
        const result = await restSelect(table, "*");
        expect(isPermissionDenied(result) || rows(result).length === 0).toBe(true);
      });
    }
  });
});
