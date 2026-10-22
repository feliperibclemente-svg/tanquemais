/**
 * Regras de acesso (RLS) testadas num Postgres local, com o schema completo do repositório
 * (supabase/setup/tanquemais-banco-completo.sql). Nunca toca o Supabase de produção.
 *
 * Roda só com TEST_DATABASE_URL (um Postgres descartável, como o serviço da CI). Cria um
 * banco temporário, aplica o schema, testa e apaga o banco no fim.
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const describeDb = ADMIN_URL ? describe : describe.skip;

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const VA = "aaaaaaaa-1111-4000-8000-000000000001";
const VB = "bbbbbbbb-1111-4000-8000-000000000002";

let admin: ReturnType<typeof postgres>;
let db: ReturnType<typeof postgres>;
const dbName = `tanque_rls_${Date.now()}`;

/** Executa `fn` como o usuário `uid` (papel authenticated) numa transação desfeita no fim. */
async function asUser<T>(uid: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  let result: T | undefined;
  let failure: unknown;
  await db
    .begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub', ${uid}, true)`;
      await tx.unsafe("set local role authenticated");
      try {
        result = await fn(tx);
      } catch (error) {
        failure = error;
      }
      throw new Error("rollback");
    })
    .catch((error) => {
      if ((error as Error).message !== "rollback") throw error;
    });
  if (failure) throw failure;
  return result as T;
}

const fueling = (uid: string, vehicle: string, odometer: number) => ({
  user_id: uid,
  vehicle_id: vehicle,
  fuel_type_id: "gasolina",
  liters: 40,
  price_per_liter: 6,
  total_cost: 240,
  odometer,
  full_tank: true,
});

if (ADMIN_URL) {
  beforeAll(async () => {
    admin = postgres(ADMIN_URL!, { max: 1, onnotice: () => {} });
    await admin.unsafe(`create database ${dbName}`);
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${dbName}`;
    db = postgres(url.toString(), { max: 1, onnotice: () => {} });
    await db.unsafe(readFileSync("tests/db/supabase-stub.sql", "utf8")).simple();
    await db.unsafe(readFileSync("supabase/setup/tanquemais-banco-completo.sql", "utf8")).simple();
    await db`insert into auth.users (id, email) values (${A}, 'a@teste.local'), (${B}, 'b@teste.local')`;
    await db`insert into public.vehicles (id, user_id, brand, model, fuel_type_id, initial_odometer, current_odometer)
             values (${VA}, ${A}, 'Fiat', 'Argo', 'gasolina', 1000, 1000),
                    (${VB}, ${B}, 'Honda Motos', 'Biz', 'gasolina', 5000, 5000)`;
    await db`insert into public.fuelings ${db(fueling(B, VB, 5200))}`;
  }, 60_000);

  afterAll(async () => {
    await db?.end();
    await admin?.unsafe(`drop database if exists ${dbName}`);
    await admin?.end();
  });
}

describeDb("RLS local: abastecimentos e veículos", () => {
  it("registra abastecimento no próprio veículo", async () => {
    const rows = await asUser(
      A,
      (tx) => tx`insert into public.fuelings ${tx(fueling(A, VA, 1500))} returning id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("recusa abastecimento no veículo de outra pessoa (achado R1)", async () => {
    await expect(
      asUser(A, (tx) => tx`insert into public.fuelings ${tx(fueling(A, VB, 999999))}`),
    ).rejects.toThrow(/row-level security/);
    const [v] = await db`select current_odometer from public.vehicles where id = ${VB}`;
    expect(Number(v.current_odometer)).toBe(5200);
  });

  it("recusa mover um abastecimento próprio para o veículo de outra pessoa", async () => {
    await expect(
      asUser(A, async (tx) => {
        const [row] =
          await tx`insert into public.fuelings ${tx(fueling(A, VA, 1600))} returning id`;
        await tx`update public.fuelings set vehicle_id = ${VB} where id = ${row.id}`;
      }),
    ).rejects.toThrow(/row-level security/);
  });

  it("não lê abastecimentos nem veículos de outra pessoa", async () => {
    const seen = await asUser(A, async (tx) => ({
      fuelings: await tx`select id from public.fuelings where user_id = ${B}`,
      vehicles: await tx`select id from public.vehicles where id = ${VB}`,
    }));
    expect(seen.fuelings).toHaveLength(0);
    expect(seen.vehicles).toHaveLength(0);
  });

  it("não altera nem apaga abastecimentos de outra pessoa", async () => {
    const result = await asUser(A, async (tx) => ({
      updated:
        await tx`update public.fuelings set total_cost = 1 where user_id = ${B} returning id`,
      deleted: await tx`delete from public.fuelings where user_id = ${B} returning id`,
    }));
    expect(result.updated).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });
});

describeDb("limites e limpeza do protótipo", () => {
  it("limite diário de IA por pessoa", async () => {
    const answers = await asUser(A, async (tx) => {
      const out: boolean[] = [];
      for (let i = 0; i < 3; i++) {
        const [r] = await tx`select public.ai_take('dica', 2) as ok`;
        out.push(r.ok);
      }
      return out;
    });
    expect(answers).toEqual([true, true, false]);
  });

  it("visitante não usa a função de limite de IA", async () => {
    await expect(
      db.begin(async (tx) => {
        await tx.unsafe("set local role anon");
        await tx`select public.ai_take('dica', 2)`;
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("app_errors descarta o excesso por hora sem dar erro", async () => {
    const count = await db.begin(async (tx) => {
      await tx.unsafe("set local role anon");
      for (let i = 0; i < 205; i++) {
        await tx`insert into public.app_errors (message) values (${`erro ${i}`})`;
      }
      await tx.unsafe("reset role");
      const [r] = await tx`select count(*)::int as n from public.app_errors`;
      return r.n as number;
    });
    expect(count).toBe(200);
  });

  it("sem postos, preços e clubes inventados do protótipo", async () => {
    const [r] = await db`select
      (select count(*) from public.stations where id::text like '22222222-0000-4000-8000-%')::int as stations,
      (select count(*) from public.station_prices)::int as prices,
      (select count(*) from public.clubs where id::text like '11111111-0000-4000-8000-%')::int as clubs`;
    expect(r).toEqual({ stations: 0, prices: 0, clubs: 0 });
  });
});

describeDb("preços por posto da ANP", () => {
  it("quem está logado lê, mas não grava; visitante não lê", async () => {
    await db`insert into public.fuel_station_prices
      (week_start, week_end, uf, municipio, cnpj, name, fuel_type_id, price)
      values ('2026-10-11', '2026-10-17', 'GO', 'GOIANIA', '00000000000191', 'Posto Teste', 'gasolina', 6.49)`;
    const rows = await asUser(A, (tx) => tx`select name from public.fuel_station_prices`);
    expect(rows.map((r) => r.name)).toContain("Posto Teste");
    await expect(
      asUser(
        A,
        (tx) => tx`insert into public.fuel_station_prices
          (week_start, week_end, uf, municipio, cnpj, name, fuel_type_id, price)
          values ('2026-10-11', '2026-10-17', 'GO', 'GOIANIA', '1', 'Falso', 'gasolina', 1)`,
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.begin(async (tx) => {
        await tx.unsafe("set local role anon");
        await tx`select 1 from public.fuel_station_prices`;
      }),
    ).rejects.toThrow(/permission denied/);
  });
});
