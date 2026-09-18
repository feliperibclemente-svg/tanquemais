import type { Fueling } from "@/types/domain";
import type { StationWithPrice } from "@/repositories";
import { monthKey } from "@/lib/format";

/* =========================================================================
 * Toda a matemática do Tanque+ vive aqui. Componentes só exibem resultados.
 * ========================================================================= */

export interface FuelingComputed extends Fueling {
  distance: number | null;
  computed_km_per_liter: number | null;
  computed_cost_per_km: number | null;
}

/**
 * Faixa plausível de consumo (km/L). Fora disso o dado veio de odômetro digitado
 * errado e é descartado para não contaminar médias mostradas ao usuário.
 */
const MIN_KML = 1;
const MAX_KML = 40;
const plausible = (v: number | null) => (v && v >= MIN_KML && v <= MAX_KML ? v : null);

/** Ordena por data e calcula distância/consumo a partir do abastecimento anterior do mesmo veículo. */
export function computeFuelings(fuelings: Fueling[]): FuelingComputed[] {
  const asc = [...fuelings].sort(
    (a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime(),
  );
  const lastByVehicle = new Map<string, Fueling>();

  const rows = asc.map((f) => {
    const prev = lastByVehicle.get(f.vehicle_id);
    lastByVehicle.set(f.vehicle_id, f);
    if (!prev || f.odometer <= prev.odometer || !f.liters) {
      return { ...f, distance: null, computed_km_per_liter: null, computed_cost_per_km: null };
    }
    const distance = f.odometer - prev.odometer;
    return {
      ...f,
      distance,
      computed_km_per_liter: plausible(f.km_per_liter ?? distance / f.liters),
      computed_cost_per_km: f.cost_per_km ?? f.total_cost / distance,
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
  const map = new Map<string, { gasto: number; litros: number; kml: number[]; precos: number[] }>();

  for (const f of rows) {
    const key = monthKey(f.filled_at);
    const entry = map.get(key) ?? { gasto: 0, litros: 0, kml: [], precos: [] };
    entry.gasto += Number(f.total_cost) || 0;
    entry.litros += Number(f.liters) || 0;
    if (f.computed_km_per_liter) entry.kml.push(f.computed_km_per_liter);
    if (f.price_per_liter) entry.precos.push(Number(f.price_per_liter));
    map.set(key, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, e]) => ({
      key,
      label: monthFmt.format(new Date(`${key}-01T12:00:00`)).replace(".", ""),
      gasto: Number(e.gasto.toFixed(2)),
      litros: Number(e.litros.toFixed(1)),
      consumo: e.kml.length ? Number(avg(e.kml).toFixed(2)) : null,
      precoMedio: e.precos.length ? Number(avg(e.precos).toFixed(3)) : null,
    }));
}

const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;

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
  last: FuelingComputed | null;
  series: MonthPoint[];
}

export function overview(rows: FuelingComputed[]): Overview {
  const series = monthlySeries(rows);
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const monthSpend = series.find((s) => s.key === thisKey)?.gasto ?? 0;
  const previousMonthSpend = series.find((s) => s.key === prevKey)?.gasto ?? 0;

  const kmls = rows.map((r) => r.computed_km_per_liter).filter((v): v is number => !!v);
  const prices = rows.map((r) => Number(r.price_per_liter)).filter((v) => v > 0);
  const distances = rows.map((r) => r.distance ?? 0);
  const totalKm = distances.reduce((s, n) => s + n, 0);
  const totalSpend = rows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
  const totalLiters = rows.reduce((s, r) => s + (Number(r.liters) || 0), 0);

  const cheapest = prices.length ? Math.min(...prices) : 0;
  const savings = cheapest
    ? rows.reduce((s, r) => s + (Number(r.price_per_liter) - cheapest) * Number(r.liters), 0)
    : 0;

  return {
    count: rows.length,
    monthSpend,
    previousMonthSpend,
    monthDelta:
      previousMonthSpend > 0 ? (monthSpend - previousMonthSpend) / previousMonthSpend : null,
    totalSpend,
    totalLiters,
    totalKm,
    avgKmPerLiter: kmls.length ? avg(kmls) : null,
    bestKmPerLiter: kmls.length ? Math.max(...kmls) : null,
    worstKmPerLiter: kmls.length ? Math.min(...kmls) : null,
    avgPricePerLiter: prices.length ? avg(prices) : null,
    costPerKm: totalKm > 0 ? totalSpend / totalKm : null,
    savings: Math.max(0, savings),
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

/** Quanto dá para economizar no próximo tanque, comparando com o posto mais barato. */
export function savingsOpportunity(
  rows: FuelingComputed[],
  stations: StationWithPrice[],
  fuelTypeId: string | null,
  tankLiters: number | null,
): SavingsOpportunity {
  const liters = tankLiters && tankLiters > 0 ? tankLiters : 40;
  const recent = rows.slice(0, 3).filter((r) => !fuelTypeId || r.fuel_type_id === fuelTypeId);
  const referencePrice = recent.length ? avg(recent.map((r) => Number(r.price_per_liter))) : null;

  let cheapestPrice: number | null = null;
  let stationName: string | null = null;
  let stationId: string | null = null;

  for (const station of stations) {
    for (const price of station.station_prices ?? []) {
      if (fuelTypeId && price.fuel_type_id !== fuelTypeId) continue;
      if (cheapestPrice == null || Number(price.price) < cheapestPrice) {
        cheapestPrice = Number(price.price);
        stationName = station.name;
        stationId = station.id;
      }
    }
  }

  const amount =
    referencePrice != null && cheapestPrice != null && referencePrice > cheapestPrice
      ? (referencePrice - cheapestPrice) * liters
      : 0;

  return { amount, cheapestPrice, referencePrice, stationName, stationId, liters };
}
