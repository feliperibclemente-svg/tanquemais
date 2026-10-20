import type { FuelingComputed } from "@/services/analytics";

/* =========================================================================
 * Custo de combustível por km ESTIMADO pelo km do painel, para quem quase
 * nunca enche o tanque (comum entre entregadores de moto).
 *
 * Conta: o combustível comprado do 1º ao penúltimo abastecimento move o
 * veículo do km do 1º até o km do último. Supõe que o nível do tanque é
 * parecido no começo e no fim do período, por isso é "estimado" e só usa
 * 90 dias, 3 registros e 50 km ou mais. O custo medido entre tanques cheios
 * continua tendo prioridade nas telas.
 * Testado em tests/unit/cost-estimate.test.ts.
 * ========================================================================= */

export const ESTIMATE_DAYS = 90;
export const ESTIMATE_MIN_FUELINGS = 3;
export const ESTIMATE_MIN_KM = 50;

type Row = Pick<FuelingComputed, "filled_at" | "odometer" | "total_cost" | "issue">;

export function estimatedCostPerKm(
  rows: Row[],
  now = new Date(),
): { costPerKm: number; distance: number; fuelings: number } | null {
  const since = now.getTime() - ESTIMATE_DAYS * 24 * 60 * 60_000;
  const valid = rows
    .filter(
      (r) =>
        r.issue !== "duplicate" &&
        r.issue !== "odometer" &&
        Number(r.odometer) > 0 &&
        new Date(r.filled_at).getTime() >= since,
    )
    .sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime());
  if (valid.length < ESTIMATE_MIN_FUELINGS) return null;
  const distance = Number(valid[valid.length - 1].odometer) - Number(valid[0].odometer);
  if (distance < ESTIMATE_MIN_KM) return null;
  const cost = valid.slice(0, -1).reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
  if (!(cost > 0)) return null;
  return { costPerKm: cost / distance, distance, fuelings: valid.length };
}
