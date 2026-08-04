/**
 * Usuário autenticado, membro de clube e seguidor.
 *
 * Requer credenciais reais de teste (veja tests/rls/helpers.ts). Sem elas os
 * cenários são pulados, para que a suíte continue rodando em qualquer máquina.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  hasUserA,
  hasUserB,
  isPermissionDenied,
  restSelect,
  rows,
  signIn,
  testUsers,
  userIdFromToken,
} from "./helpers";

const describeAuth = hasUserA ? describe : describe.skip;
const describeTwoUsers = hasUserA && hasUserB ? describe : describe.skip;

let tokenA = "";
let tokenB = "";
let userA = "";
let userB = "";

beforeAll(async () => {
  if (hasUserA) {
    tokenA = await signIn(testUsers.a.email, testUsers.a.password);
    userA = userIdFromToken(tokenA);
  }
  if (hasUserB) {
    tokenB = await signIn(testUsers.b.email, testUsers.b.password);
    userB = userIdFromToken(tokenB);
  }
});

describeAuth("usuário autenticado", () => {
  it("lê os próprios veículos e apenas os próprios", async () => {
    const result = await restSelect("vehicles", "id,user_id", { token: tokenA });
    expect(result.status).toBe(200);
    for (const row of rows(result)) expect(row["user_id"]).toBe(userA);
  });

  it("lê os próprios abastecimentos e apenas os próprios", async () => {
    const result = await restSelect("fuelings", "id,user_id", { token: tokenA });
    expect(result.status).toBe(200);
    for (const row of rows(result)) expect(row["user_id"]).toBe(userA);
  });

  it("lê apenas o próprio feedback", async () => {
    const result = await restSelect("feedback", "id,user_id", { token: tokenA });
    expect(result.status).toBe(200);
    for (const row of rows(result)) expect(row["user_id"]).toBe(userA);
  });

  it("lê apenas as próprias estatísticas", async () => {
    const result = await restSelect("user_statistics", "user_id", { token: tokenA });
    expect(result.status).toBe(200);
    for (const row of rows(result)) expect(row["user_id"]).toBe(userA);
  });

  it("lê apenas as próprias notificações e insights", async () => {
    for (const table of ["notifications", "ai_insights"]) {
      const result = await restSelect(table, "id,user_id", { token: tokenA });
      expect(result.status).toBe(200);
      for (const row of rows(result)) expect(row["user_id"]).toBe(userA);
    }
  });

  it("continua sem enxergar quem reportou preços", async () => {
    expect(isPermissionDenied(await restSelect("station_prices", "reported_by", { token: tokenA }))).toBe(
      true,
    );
    expect(isPermissionDenied(await restSelect("price_history", "reported_by", { token: tokenA }))).toBe(
      true,
    );
  });

  it("lê preços e postos normalmente", async () => {
    expect((await restSelect("stations", "id,name", { token: tokenA })).status).toBe(200);
    expect(
      (await restSelect("station_prices", "station_id,fuel_type_id,price", { token: tokenA })).status,
    ).toBe(200);
  });
});

describeAuth("membro de clube", () => {
  it("só enxerga rosters de clubes dos quais participa", async () => {
    const mine = await restSelect("club_members", "club_id,user_id", {
      token: tokenA,
      query: `user_id=eq.${userA}`,
    });
    expect(mine.status).toBe(200);

    const myClubs = new Set(rows(mine).map((row) => row["club_id"]));
    const all = await restSelect("club_members", "club_id,user_id", { token: tokenA });
    expect(all.status).toBe(200);
    for (const row of rows(all)) {
      const visible = row["user_id"] === userA || myClubs.has(row["club_id"]);
      expect(visible).toBe(true);
    }
  });
});

describeTwoUsers("outro usuário / seguidor", () => {
  it("não lê veículos, abastecimentos nem feedback do usuário A", async () => {
    for (const table of ["vehicles", "fuelings", "feedback"]) {
      const result = await restSelect(table, "id,user_id", {
        token: tokenB,
        query: `user_id=eq.${userA}`,
      });
      expect(isPermissionDenied(result) || rows(result).length === 0).toBe(true);
    }
  });

  it("só enxerga relações de seguidores em que participa", async () => {
    const result = await restSelect("followers", "follower_id,following_id", { token: tokenB });
    expect(result.status).toBe(200);
    for (const row of rows(result)) {
      expect(row["follower_id"] === userB || row["following_id"] === userB).toBe(true);
    }
  });

  it("não enxerga rosters de clubes de que não participa", async () => {
    const mine = await restSelect("club_members", "club_id", {
      token: tokenB,
      query: `user_id=eq.${userB}`,
    });
    const myClubs = new Set(rows(mine).map((row) => row["club_id"]));
    const all = await restSelect("club_members", "club_id,user_id", { token: tokenB });
    for (const row of rows(all)) {
      expect(row["user_id"] === userB || myClubs.has(row["club_id"])).toBe(true);
    }
  });
});
