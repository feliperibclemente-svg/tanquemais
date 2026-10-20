import { readFileSync } from "node:fs";
import { test as base, type Page } from "@playwright/test";

/**
 * Supabase simulado no navegador: sessão de um usuário de teste e tabelas em memória.
 * Cada teste começa com o estado que pedir e pode ler o que o app tentou gravar.
 */
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)=["']?([^"'\n]*)["']?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2]]),
);
const SUPABASE_URL = env.VITE_SUPABASE_URL as string;
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];

export const USER_ID = "11111111-2222-4333-8444-555555555555";
export const VEHICLE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export type Row = Record<string, unknown>;
export interface MockDb {
  profile: Row;
  vehicles: Row[];
  fuelings: Row[];
  /** Corpos enviados ao banco, por tabela. */
  writes: { table: string; method: string; body: unknown }[];
}

export const completeProfile = (extra: Row = {}): Row => ({
  id: USER_ID,
  full_name: "Ana Souza",
  first_name: "Ana",
  last_name: "Souza",
  birth_date: "1990-05-01",
  city: "Goiânia",
  state: "GO",
  ...extra,
});

export const argo = (extra: Row = {}): Row => ({
  id: VEHICLE_ID,
  user_id: USER_ID,
  brand: "Fiat",
  model: "Argo",
  nickname: null,
  is_primary: true,
  fuel_type_id: "gasolina",
  initial_odometer: 10000,
  current_odometer: 10000,
  tank_liters: 48,
  created_at: daysAgo(60),
  ...extra,
});

export const fueling = (n: number, extra: Row = {}): Row => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  user_id: USER_ID,
  vehicle_id: VEHICLE_ID,
  fuel_type_id: "gasolina",
  filled_at: daysAgo(30),
  odometer: 10000,
  liters: 40,
  price_per_liter: 6,
  total_cost: 240,
  full_tank: true,
  station_id: null,
  station_name: null,
  note: null,
  created_at: daysAgo(30),
  ...extra,
});

async function mockSupabase(page: Page, db: MockDb) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const token = `${b64({ alg: "HS256" })}.${b64({ sub: USER_ID, role: "authenticated", exp: now + 3600, aud: "authenticated" })}.sig`;
  const user = {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "teste@tanquemais.local",
    app_metadata: {},
    user_metadata: {},
    created_at: daysAgo(60),
  };
  const session = {
    access_token: token,
    refresh_token: "rt",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user,
  };
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
      localStorage.setItem("tanque:tour:v1", "1");
    },
    [`sb-${PROJECT_REF}-auth-token`, JSON.stringify(session)] as const,
  );
  await page.route("https://accounts.google.com/**", (r) => r.abort());
  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const reply = (rows: Row[]) =>
      route.fulfill({
        json: single ? (rows[0] ?? null) : rows,
        status: method === "POST" ? 201 : 200,
      });

    if (url.pathname === "/auth/v1/user") return route.fulfill({ json: user });
    if (url.pathname.startsWith("/auth/")) return route.fulfill({ json: {} });
    const table = url.pathname.replace("/rest/v1/", "");
    if (method !== "GET" && method !== "HEAD") {
      const body = req.postDataJSON?.() ?? null;
      db.writes.push({ table, method, body });
      if (table === "profiles" && method === "PATCH") {
        Object.assign(db.profile, body);
        return reply([db.profile]);
      }
      if (table === "vehicles" && method === "POST") {
        const row = argo({ ...(body as Row), id: VEHICLE_ID });
        db.vehicles.push(row);
        return reply([row]);
      }
      if (table === "fuelings" && method === "POST") {
        const row = { ...(body as Row), created_at: new Date().toISOString() };
        db.fuelings.unshift(row);
        return reply([row]);
      }
      return reply([]);
    }
    if (table === "profiles") return reply([db.profile]);
    if (table === "vehicles") return reply(db.vehicles);
    if (table === "fuelings") return reply(db.fuelings);
    return reply([]);
  });
}

export const test = base.extend<{ db: MockDb }>({
  db: async ({ page }, provide) => {
    const db: MockDb = { profile: completeProfile(), vehicles: [argo()], fuelings: [], writes: [] };
    await mockSupabase(page, db);
    await provide(db);
  },
});

export { expect } from "@playwright/test";
