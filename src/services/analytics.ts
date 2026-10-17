import type { Fueling } from "@/types/domain";
import type { StationWithPrice } from "@/repositories";
import { monthKey } from "@/lib/format";

/* =========================================================================
 * Toda a matemática do Tanque+ vive aqui. Componentes só exibem resultados.
 * ========================================================================= */

/**
 * Problemas de dados detectados em um registro.
 * - duplicate: mesmo veículo, km, litros e valor do registro anterior (toque duplo ou
 *   reenvio). Fica fora de todos os cálculos de consumo e custo por km.
 * - odometer: km menor ou igual ao do registro anterior. Os litros contam (o combustível
 *   existiu), mas o km não é usado como referência.
 * - outlier: consumo muito diferente do habitual do veículo (ex.: abastecimento não
 *   registrado ou tanque não completado). Aparece no histórico, mas não entra nas médias.
 */
export type FuelingIssue = "duplicate" | "odometer" | "outlier";

export interface FuelingComputed extends Fueling {
  /** Distância do intervalo tanque cheio → tanque cheio que termina neste registro. */
  distance: number | null;
  computed_km_per_liter: number | null;
  computed_cost_per_km: number | null;
  /** Litros e custo acumulados no intervalo medido (só quando há consumo). */
  interval_liters: number | null;
  interval_cost: number | null;
  issue: FuelingIssue | null;
  /** Consumo medido que ficou fora das médias por ser atípico (issue = "outlier"). */
  outlier_km_per_liter: number | null;
}

/**
 * Faixa plausível de consumo (km/L). Fora disso o dado veio de odômetro digitado
 * errado e é descartado para não contaminar médias mostradas ao usuário.
 */
export const MIN_KML = 3;
export const MAX_KML = 40;
/** Com pelo menos esta quantidade de trechos, dá para saber o que é "habitual". */
export const OUTLIER_MIN_INTERVALS = 4;
/** Trecho atípico: consumo 50% acima ou abaixo da mediana do veículo no mesmo combustível. */
export const OUTLIER_FACTOR = 1.5;

const byDateThenOdometer = (a: Fueling, b: Fueling) =>
  new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime() ||
  Number(a.odometer) - Number(b.odometer);

const near = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) <= tolerance;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

/**
 * Método tanque cheio → tanque cheio, por veículo. Nunca usa km/L gravado no banco.
 *
 * Consumo do trecho = km entre dois tanques cheios ÷ litros colocados depois do primeiro
 * (inclusive os parciais e o que completou o tanque no fim do trecho).
 * Custo por km do trecho = valor pago nesses mesmos abastecimentos ÷ km do trecho.
 * Retorna mais recente primeiro.
 */
export function computeFuelings(fuelings: Fueling[]): FuelingComputed[] {
  const asc = [...fuelings].sort(byDateThenOdometer);
  const state = new Map<
    string,
    { anchorKm: number | null; liters: number; cost: number; last: Fueling | null }
  >();

  const rows: FuelingComputed[] = asc.map((f) => {
    const empty: FuelingComputed = {
      ...f,
      distance: null,
      computed_km_per_liter: null,
      computed_cost_per_km: null,
      interval_liters: null,
      interval_cost: null,
      issue: null,
      outlier_km_per_liter: null,
    };
    const odometer = Number(f.odometer) || 0;
    const liters = Number(f.liters) || 0;
    const cost = Number(f.total_cost) || 0;
    const s = state.get(f.vehicle_id) ?? { anchorKm: null, liters: 0, cost: 0, last: null };
    state.set(f.vehicle_id, s);
    const previous = s.last;
    s.last = f;

    if (
      previous &&
      near(Number(previous.odometer), odometer, 0.5) &&
      near(Number(previous.liters), liters) &&
      near(Number(previous.total_cost), cost)
    ) {
      // Mesmo abastecimento registrado duas vezes: não soma litros nem custo.
      s.last = previous;
      return { ...empty, issue: "duplicate" };
    }

    const odometerIssue = !!previous && odometer > 0 && odometer <= Number(previous.odometer);

    if (s.anchorKm == null) {
      // Primeiro registro (ou ainda sem âncora): consumo null; vira âncora se for tanque cheio com km.
      if (f.full_tank && odometer > 0) {
        s.anchorKm = odometer;
        s.liters = 0;
        s.cost = 0;
      }
      return odometerIssue ? { ...empty, issue: "odometer" } : empty;
    }

    s.liters += liters;
    s.cost += cost;

    if (odometerIssue || odometer <= s.anchorKm) {
      return { ...empty, issue: odometer > 0 ? "odometer" : null };
    }
    if (!f.full_tank) return empty;

    const distance = odometer - s.anchorKm;
    const kml = s.liters > 0 ? distance / s.liters : 0;
    const intervalLiters = s.liters;
    const intervalCost = s.cost;
    s.anchorKm = odometer;
    s.liters = 0;
    s.cost = 0;

    if (kml < MIN_KML || kml > MAX_KML) return empty;
    return {
      ...empty,
      distance,
      computed_km_per_liter: kml,
      computed_cost_per_km: intervalCost / distance,
      interval_liters: intervalLiters,
      interval_cost: intervalCost,
    };
  });

  return markOutliers(rows).reverse();
}

/**
 * Trechos com consumo muito diferente do habitual do mesmo veículo e combustível saem das
 * médias. Só é aplicado com histórico suficiente para existir um "habitual".
 */
function markOutliers(rows: FuelingComputed[]): FuelingComputed[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.computed_km_per_liter) continue;
    const key = `${r.vehicle_id}|${r.fuel_type_id}`;
    groups.set(key, [...(groups.get(key) ?? []), r.computed_km_per_liter]);
  }
  return rows.map((r) => {
    const values = groups.get(`${r.vehicle_id}|${r.fuel_type_id}`);
    if (!r.computed_km_per_liter || !values || values.length < OUTLIER_MIN_INTERVALS) return r;
    const typical = median(values);
    const kml = r.computed_km_per_liter;
    if (kml <= typical * OUTLIER_FACTOR && kml >= typical / OUTLIER_FACTOR) return r;
    return {
      ...r,
      issue: "outlier",
      outlier_km_per_liter: kml,
      distance: null,
      computed_km_per_liter: null,
      computed_cost_per_km: null,
      interval_liters: null,
      interval_cost: null,
    };
  });
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
  /** Km medidos entre tanques cheios (não é o total rodado: trechos sem medição ficam fora). */
  totalKm: number;
  /** Consumo médio só do combustível mais recente (gasolina e etanol não se misturam). */
  avgKmPerLiter: number | null;
  bestKmPerLiter: number | null;
  worstKmPerLiter: number | null;
  avgPricePerLiter: number | null;
  /** Custo de combustível por km medido, em todos os combustíveis (R$ é R$). */
  costPerKm: number | null;
  /** Registros fora das contas por suspeita de duplicidade. */
  duplicates: number;
  /** Trechos com consumo atípico, fora das médias. */
  outliers: number;
  /** Combustível do abastecimento mais recente: base de preço médio, consumo e melhor/pior. */
  fuelTypeId: string | null;
  /** Variação do consumo entre os dois últimos meses consecutivos comparáveis. */
  consumptionTrend: { previous: number; current: number } | null;
  last: FuelingComputed | null;
  series: MonthPoint[];
}

export function overview(allRows: FuelingComputed[]): Overview {
  // Registros duplicados não entram em gasto, litros nem consumo.
  const rows = allRows.filter((r) => r.issue !== "duplicate");
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

  const fuelTypeId = rows[0]?.fuel_type_id ?? null;
  const sameFuel = rows.filter((r) => r.fuel_type_id === fuelTypeId);
  const kmls = sameFuel.map((r) => r.computed_km_per_liter).filter((v): v is number => !!v);
  const fuelSpend = sameFuel.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
  const fuelLiters = sameFuel.reduce((s, r) => s + (Number(r.liters) || 0), 0);
  const totalSpend = rows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
  const totalLiters = rows.reduce((s, r) => s + (Number(r.liters) || 0), 0);
  /** Trechos válidos: têm distância e consumo plausível. Base única para km/L e R$/km. */
  const valid = rows.filter((r) => r.computed_km_per_liter && r.distance);
  const totalKm = valid.reduce((s, r) => s + (r.distance ?? 0), 0);
  const validCost = valid.reduce((s, r) => s + (r.interval_cost ?? 0), 0);

  // Consumo médio = km medidos ÷ litros dos trechos que terminaram com o combustível atual.
  const fuelValid = valid.filter((r) => r.fuel_type_id === fuelTypeId);
  const fuelKm = fuelValid.reduce((s, r) => s + (r.distance ?? 0), 0);
  const fuelValidLiters = fuelValid.reduce((s, r) => s + (r.interval_liters ?? 0), 0);

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
    avgKmPerLiter: fuelValidLiters > 0 ? fuelKm / fuelValidLiters : null,
    bestKmPerLiter: kmls.length ? Math.max(...kmls) : null,
    worstKmPerLiter: kmls.length ? Math.min(...kmls) : null,
    avgPricePerLiter: fuelLiters > 0 ? fuelSpend / fuelLiters : null,
    costPerKm: totalKm > 0 ? validCost / totalKm : null,
    duplicates: allRows.length - rows.length,
    outliers: rows.filter((r) => r.issue === "outlier").length,
    fuelTypeId,
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

/**
 * Valida a quilometragem contra os registros vizinhos do mesmo veículo na linha do tempo.
 * Retorna a mensagem de erro ou null quando está tudo certo.
 */
export function validateOdometer(
  vehicleRows: Pick<Fueling, "id" | "filled_at" | "odometer">[],
  filledAt: Date,
  odometer: number,
  ignoreId?: string,
): string | null {
  if (!(odometer > 0)) return "Informe a quilometragem atual.";
  const t = filledAt.getTime();
  const others = vehicleRows
    .filter((r) => r.id !== ignoreId)
    .sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime());
  const prev = [...others].reverse().find((r) => new Date(r.filled_at).getTime() <= t);
  const next = others.find((r) => new Date(r.filled_at).getTime() > t);
  const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
  if (prev && odometer <= Number(prev.odometer)) {
    return `A quilometragem precisa ser maior que a do registro anterior (${fmt(Number(prev.odometer))} km).`;
  }
  if (next && odometer >= Number(next.odometer)) {
    return `A quilometragem precisa ser menor que a do registro seguinte (${fmt(Number(next.odometer))} km).`;
  }
  return null;
}

/**
 * Quantos tanques cheios ainda faltam para o primeiro consumo real (método tanque cheio →
 * tanque cheio). Sem nenhum tanque cheio com km registrado faltam 2; com a âncora, falta 1.
 */
export function fullTanksMissing(rows: Pick<Fueling, "full_tank" | "odometer">[]): 1 | 2 {
  return rows.some((r) => r.full_tank && Number(r.odometer) > 0) ? 1 : 2;
}

/**
 * Situação do indicador de consumo, para explicar o que falta sem prometer o que o cálculo
 * não entrega. O consumo (km/L) sai de um trecho entre dois tanques cheios com km válido;
 * parciais no meio entram nos litros do trecho.
 * - ready: já existe consumo medido;
 * - pending: faltam 1 ou 2 tanques cheios (contando só registros não duplicados com km);
 * - waiting: já há 2+ tanques cheios, mas nenhum trecho válido para o combustível atual
 *   (troca de combustível, km inconsistente ou consumo fora do normal).
 */
export type ConsumptionProgress =
  | { state: "ready" }
  | { state: "pending"; fullTanks: 0 | 1; missing: 1 | 2 }
  | { state: "waiting" };

export function consumptionProgress(
  rows: Pick<FuelingComputed, "full_tank" | "odometer" | "issue">[],
  avgKmPerLiter: number | null,
): ConsumptionProgress {
  if (avgKmPerLiter) return { state: "ready" };
  const fullTanks = rows.filter(
    (r) => r.issue !== "duplicate" && r.full_tank && Number(r.odometer) > 0,
  ).length;
  if (fullTanks === 0) return { state: "pending", fullTanks: 0, missing: 2 };
  if (fullTanks === 1) return { state: "pending", fullTanks: 1, missing: 1 };
  return { state: "waiting" };
}

/** Frase curta para estados sem consumo (Home e Painel). */
export function consumptionProgressText(
  progress: ConsumptionProgress,
  size: "short" | "long" = "long",
): string {
  if (size === "short") {
    if (progress.state === "pending")
      return progress.missing === 2 ? "Faltam 2 tanques cheios" : "Falta 1 tanque cheio";
    return progress.state === "waiting" ? "Complete o tanque no próximo registro" : "";
  }
  if (progress.state === "pending")
    return progress.missing === 2
      ? "Complete o tanque em 2 abastecimentos para eu calcular quantos km por litro seu carro faz. Pode abastecer parcial entre eles."
      : "Complete o tanque no próximo abastecimento para eu calcular quantos km por litro seu carro faz.";
  if (progress.state === "waiting")
    return "Complete o tanque no próximo abastecimento para eu medir um novo trecho. Se algum km estiver errado, ajuste no Histórico.";
  return "";
}

export function consumptionPendingText(missing: 1 | 2): string {
  return missing === 1
    ? "Falta 1 tanque cheio para ver seu consumo real"
    : "Faltam 2 tanques cheios para ver seu consumo real";
}

/**
 * Lembrete dentro do app (sem notificação nem localização): quando o tempo desde o último
 * abastecimento passa do intervalo habitual da pessoa. Precisa de pelo menos 3 abastecimentos
 * em dias diferentes para existir um "habitual"; fica quieto depois de 60 dias sem uso.
 */
export function fuelingReminder(
  rows: Pick<FuelingComputed, "filled_at" | "issue">[],
  now = new Date(),
): { daysSince: number; typicalDays: number } | null {
  const DAY = 86_400_000;
  const days = [
    ...new Set(
      rows
        .filter((r) => r.issue !== "duplicate")
        .map((r) => Math.floor(new Date(r.filled_at).getTime() / DAY)),
    ),
  ].sort((a, b) => a - b);
  if (days.length < 3) return null;
  const gaps = days.slice(1).map((d, i) => d - days[i]);
  const typicalDays = Math.max(1, Math.round(median(gaps)));
  const daysSince = Math.floor(now.getTime() / DAY) - days[days.length - 1];
  if (daysSince < Math.max(3, typicalDays + 1) || daysSince > 60) return null;
  return { daysSince, typicalDays };
}
