import type { Fueling } from "@/types/domain";
import type { StationWithPrice } from "@/repositories";
import { monthKey } from "@/lib/format";

/* =========================================================================
 * Toda a matemática do Tanque+ vive aqui. Componentes só exibem resultados.
 * ========================================================================= */

export interface FuelingComputed extends Fueling {
  /** Distância do intervalo tanque cheio → tanque cheio que termina neste registro. */
  distance: number | null;
  computed_km_per_liter: number | null;
  computed_cost_per_km: number | null;
  /** Litros e custo acumulados no intervalo medido (só quando há consumo). */
  interval_liters: number | null;
  interval_cost: number | null;
}

/**
 * Faixa plausível de consumo (km/L). Fora disso o dado veio de odômetro digitado
 * errado e é descartado para não contaminar médias mostradas ao usuário.
 */
export const MIN_KML = 3;
export const MAX_KML = 40;

const byDateThenOdometer = (a: Fueling, b: Fueling) =>
  new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime() ||
  Number(a.odometer) - Number(b.odometer);

/**
 * Método tanque cheio → tanque cheio, por veículo. Nunca usa km/L gravado no banco.
 * Retorna mais recente primeiro.
 */
export function computeFuelings(fuelings: Fueling[]): FuelingComputed[] {
  const asc = [...fuelings].sort(byDateThenOdometer);
  const state = new Map<string, { anchorKm: number | null; liters: number; cost: number }>();

  const rows: FuelingComputed[] = asc.map((f) => {
    const empty = {
      ...f,
      distance: null,
      computed_km_per_liter: null,
      computed_cost_per_km: null,
      interval_liters: null,
      interval_cost: null,
    };
    const odometer = Number(f.odometer) || 0;
    const liters = Number(f.liters) || 0;
    const cost = Number(f.total_cost) || 0;
    const s = state.get(f.vehicle_id) ?? { anchorKm: null, liters: 0, cost: 0 };
    state.set(f.vehicle_id, s);

    if (s.anchorKm == null) {
      // Primeiro registro (ou ainda sem âncora): consumo null; vira âncora se for tanque cheio com km.
      if (f.full_tank && odometer > 0) {
        s.anchorKm = odometer;
        s.liters = 0;
        s.cost = 0;
      }
      return empty;
    }

    s.liters += liters;
    s.cost += cost;

    if (!f.full_tank || odometer <= s.anchorKm) return empty;

    const distance = odometer - s.anchorKm;
    const kml = s.liters > 0 ? distance / s.liters : 0;
    const intervalLiters = s.liters;
    const intervalCost = s.cost;
    s.anchorKm = odometer;
    s.liters = 0;
    s.cost = 0;

    if (kml < MIN_KML || kml > MAX_KML) return empty;
    return {
      ...f,
      distance,
      computed_km_per_liter: kml,
      computed_cost_per_km: intervalCost / distance,
      interval_liters: intervalLiters,
      interval_cost: intervalCost,
    };
  });

  return rows.reverse();
}

/** Consumo do próximo abastecimento, dado o odômetro anterior. */
export function estimateConsumption(
  previousOdometer: number | null,
  odometer: number,
  liters: number,
  totalCost: number,
) {
  if (!previousOdometer || odometer <= previousOdometer || !liters) {
    return { kmPerLiter: null, costPerKm: null, distance: null };
  }
  const distance = odometer - previousOdometer;
  return {
    distance,
    kmPerLiter: distance / liters,
    costPerKm: totalCost / distance,
  };
}

export interface MonthPoint {
  key: string;
  label: string;
  gasto: number;
  litros: number;
  consumo: number | null;
  precoMedio: number | null;
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short" });

export function monthlySeries(rows: FuelingComputed[]): MonthPoint[] {
  const map = new Map<string, { gasto: number; litros: number; km: number; kmLitros: number }>();

  for (const f of rows) {
    const key = monthKey(f.filled_at);
    const entry = map.get(key) ?? { gasto: 0, litros: 0, km: 0, kmLitros: 0 };
    entry.gasto += Number(f.total_cost) || 0;
    entry.litros += Number(f.liters) || 0;
    if (f.computed_km_per_liter && f.distance && f.interval_liters) {
      entry.km += f.distance;
      entry.kmLitros += f.interval_liters;
    }
    map.set(key, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, e]) => ({
      key,
      label: monthFmt.format(new Date(`${key}-01T12:00:00`)).replace(".", ""),
      gasto: Number(e.gasto.toFixed(2)),
      litros: Number(e.litros.toFixed(1)),
      consumo: e.kmLitros > 0 ? Number((e.km / e.kmLitros).toFixed(2)) : null,
      precoMedio: e.litros > 0 ? Number((e.gasto / e.litros).toFixed(3)) : null,
    }));
}


export interface Overview {
  count: number;
  monthSpend: number;
  previousMonthSpend: number;
  monthDelta: number | null;
  totalSpend: number;
  totalLiters: number;
  totalKm: number;
  avgKmPerLiter: number | null;
  bestKmPerLiter: number | null;
  worstKmPerLiter: number | null;
  avgPricePerLiter: number | null;
  costPerKm: number | null;
  savings: number;
  /** Variação do consumo entre os dois últimos meses consecutivos comparáveis. */
  consumptionTrend: { previous: number; current: number } | null;
  last: FuelingComputed | null;
  series: MonthPoint[];
}

export function overview(rows: FuelingComputed[]): Overview {
  const series = monthlySeries(rows);
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Mesmo período: dia 1 até hoje vs. dia 1 até o mesmo dia do mês anterior.
  const day = now.getDate();
  let monthSpend = 0;
  let previousMonthSpend = 0;
  for (const r of rows) {
    const d = new Date(r.filled_at);
    const key = monthKey(r.filled_at);
    if (key === thisKey && d <= now) monthSpend += Number(r.total_cost) || 0;
    else if (key === prevKey && d.getDate() <= day) previousMonthSpend += Number(r.total_cost) || 0;
  }

  const kmls = rows.map((r) => r.computed_km_per_liter).filter((v): v is number => !!v);
  const prices = rows.map((r) => Number(r.price_per_liter)).filter((v) => v > 0);
  const totalSpend = rows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
  const totalLiters = rows.reduce((s, r) => s + (Number(r.liters) || 0), 0);
  /** Trechos válidos: têm distância e consumo plausível. Base única para km/L e R$/km. */
  const valid = rows.filter((r) => r.computed_km_per_liter && r.distance);
  const totalKm = valid.reduce((s, r) => s + (r.distance ?? 0), 0);
  const validLiters = valid.reduce((s, r) => s + (r.interval_liters ?? 0), 0);
  const validCost = valid.reduce((s, r) => s + (r.interval_cost ?? 0), 0);

  const cheapest = prices.length ? Math.min(...prices) : 0;
  const savings = cheapest
    ? rows.reduce((s, r) => s + (Number(r.price_per_liter) - cheapest) * Number(r.liters), 0)
    : 0;

  return {
    count: rows.length,
    monthSpend,
    previousMonthSpend,
    monthDelta:
      previousMonthSpend > 0 && monthSpend > 0
        ? (monthSpend - previousMonthSpend) / previousMonthSpend
        : null,
    totalSpend,
    totalLiters,
    totalKm,
    avgKmPerLiter: validLiters > 0 ? totalKm / validLiters : null,
    bestKmPerLiter: kmls.length ? Math.max(...kmls) : null,
    worstKmPerLiter: kmls.length ? Math.min(...kmls) : null,
    avgPricePerLiter: totalLiters > 0 ? totalSpend / totalLiters : null,
    costPerKm: totalKm > 0 ? validCost / totalKm : null,
    savings: Math.max(0, savings),
    consumptionTrend: consumptionTrend(valid),
    last: rows[0] ?? null,
    series,
  };
}

export interface SavingsOpportunity {
  amount: number;
  cheapestPrice: number | null;
  referencePrice: number | null;
  stationName: string | null;
  stationId: string | null;
  liters: number;
}

/** Sem base de postos confiável no beta: nunca promete economia. */
export function savingsOpportunity(
  _rows: FuelingComputed[],
  _stations: StationWithPrice[],
  _fuelTypeId: string | null,
  tankLiters: number | null,
): SavingsOpportunity {
  const liters = tankLiters && tankLiters > 0 ? tankLiters : 40;
  return {
    amount: 0,
    cheapestPrice: null,
    referencePrice: null,
    stationName: null,
    stationId: null,
    liters,
  };
}

/** Tendência só entre meses consecutivos, mesmo combustível, ≥2 intervalos válidos por mês. */
function consumptionTrend(valid: FuelingComputed[]): { previous: number; current: number } | null {
  const groups = new Map<string, { km: number; liters: number; n: number }>();
  for (const r of valid) {
    const k = `${monthKey(r.filled_at)}|${r.fuel_type_id}`;
    const g = groups.get(k) ?? { km: 0, liters: 0, n: 0 };
    g.km += r.distance ?? 0;
    g.liters += r.interval_liters ?? 0;
    g.n += 1;
    groups.set(k, g);
  }
  const latest = [...valid].sort(
    (a, b) => new Date(b.filled_at).getTime() - new Date(a.filled_at).getTime(),
  )[0];
  if (!latest) return null;
  const curKey = monthKey(latest.filled_at);
  const [y, m] = curKey.split("-").map(Number);
  const pd = new Date(y, m - 2, 1);
  const prevKey = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}`;
  const cur = groups.get(`${curKey}|${latest.fuel_type_id}`);
  const prev = groups.get(`${prevKey}|${latest.fuel_type_id}`);
  if (!cur || !prev || cur.n < 2 || prev.n < 2 || !cur.liters || !prev.liters) return null;
  return { previous: prev.km / prev.liters, current: cur.km / cur.liters };
}
