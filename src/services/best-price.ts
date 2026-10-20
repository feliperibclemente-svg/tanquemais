import type { FuelingComputed } from "@/services/analytics";

/* =========================================================================
 * "Onde você pagou menos": o menor preço por litro que a própria pessoa
 * registrou, separado por combustível (etanol e gasolina não se comparam).
 * Só olha os últimos 90 dias: preço antigo não diz nada sobre hoje.
 * Testado em tests/unit/best-price.test.ts.
 * ========================================================================= */

export const BEST_PRICE_DAYS = 90;
/** Com um abastecimento só, "o melhor" não quer dizer nada. */
export const BEST_PRICE_MIN = 2;

export interface BestPrice {
  fuelingId: string;
  fuelTypeId: string;
  price: number;
  stationName: string | null;
  filledAt: string;
  /** Quantos abastecimentos desse combustível entraram na comparação. */
  compared: number;
}

type Row = Pick<
  FuelingComputed,
  "id" | "fuel_type_id" | "price_per_liter" | "filled_at" | "issue"
> & { station_name?: string | null };

export function bestPricesByFuel(rows: Row[], now = new Date()): BestPrice[] {
  const since = now.getTime() - BEST_PRICE_DAYS * 24 * 60 * 60_000;
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const t = new Date(r.filled_at).getTime();
    if (r.issue === "duplicate" || !(Number(r.price_per_liter) > 0)) continue;
    if (t < since || t > now.getTime()) continue;
    groups.set(r.fuel_type_id, [...(groups.get(r.fuel_type_id) ?? []), r]);
  }
  const result: BestPrice[] = [];
  for (const [fuelTypeId, list] of groups) {
    if (list.length < BEST_PRICE_MIN) continue;
    // menor preço; empate fica com o mais recente
    const best = list.reduce((a, b) => {
      const pa = Number(a.price_per_liter);
      const pb = Number(b.price_per_liter);
      if (pb < pa) return b;
      if (pb === pa && new Date(b.filled_at) > new Date(a.filled_at)) return b;
      return a;
    });
    result.push({
      fuelingId: best.id,
      fuelTypeId,
      price: Number(best.price_per_liter),
      stationName: best.station_name?.trim() || null,
      filledAt: best.filled_at,
      compared: list.length,
    });
  }
  return result.sort((a, b) => b.compared - a.compared);
}

/** Postos que a pessoa já digitou, do mais recente para o mais antigo, sem repetir. */
export function recentStations(
  rows: { station_name?: string | null; filled_at: string }[],
  max = 3,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const sorted = [...rows].sort(
    (a, b) => new Date(b.filled_at).getTime() - new Date(a.filled_at).getTime(),
  );
  for (const r of sorted) {
    const name = r.station_name?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}
