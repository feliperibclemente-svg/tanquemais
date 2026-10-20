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

describeDb("RLS local: abastecimentos e veículos", () => {
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
