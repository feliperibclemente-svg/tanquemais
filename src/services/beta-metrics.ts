/**
 * Métricas do beta, calculadas a partir das linhas brutas do banco.
 * Função pura: recebe as listas e devolve só números agregados (sem e-mail ou nome).
 */
import { computeFuelings } from "@/services/analytics";
import type { Fueling } from "@/types/domain";

export interface MetricsInput {
  now: Date;
  users: { id: string; created_at: string }[];
  vehicles: { user_id: string; brand: string; model: string }[];
  /** Com os campos do cálculo (opcionais), o painel também conta o primeiro consumo real. */
  fuelings: ({ user_id: string; created_at: string } & Partial<Fueling>)[];
  events: { user_id: string; name: string; created_at: string; props?: unknown }[];
  feedback: {
    kind: string;
    rating: number | null;
    message: string;
    page: string | null;
    created_at: string;
  }[];
}

export interface WeekPoint {
  /** Segunda-feira da semana, AAAA-MM-DD. */
  week: string;
  activeUsers: number;
  fuelings: number;
}

export interface BetaMetrics {
  generatedAt: string;
  funnel: {
    signups: number;
    withVehicle: number;
    withFirstFueling: number;
    withSecondFueling: number;
    withThreeFuelings: number;
    /** Pessoas com pelo menos um trecho tanque cheio a tanque cheio válido. */
    withRealConsumption: number | null;
  };
  /** Últimos 7 dias. */
  core: {
    /** Pessoas distintas que abriram cada tela. */
    screens: Record<string, number>;
    formOpened: number;
    fuelingsCreated: number;
    formErrors: Record<string, number>;
    syncFailures: number;
  };
  /** Por origem do link (?ref=): cadastros e quantos registraram o 1º abastecimento. */
  sources: { source: string; signups: number; withFirstFueling: number }[];
  /** Dos cadastrados há 48 h ou mais, quantos registraram o 1º abastecimento em até 48 h. */
  activation48h: { eligible: number; activated: number; rate: number | null };
  /** Dos cadastrados há 21 dias ou mais, quantos chegaram a 3 abastecimentos em até 21 dias. */
  threeIn21Days: { eligible: number; reached: number; rate: number | null };
  signupsLast7Days: number;
  installs: number;
  weeks: WeekPoint[];
  feedback: {
    total: number;
    averageRating: number | null;
    byKind: Record<string, number>;
    latest: MetricsInput["feedback"];
  };
  topVehicles: { name: string; count: number }[];
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Segunda-feira (UTC) da semana de uma data, como AAAA-MM-DD. */
export function weekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Quem já viu o consumo real; null quando as linhas não trazem os campos do cálculo. */
function realConsumptionUsers(fuelings: MetricsInput["fuelings"]): number | null {
  if (!fuelings.length) return 0;
  if (fuelings.some((f) => f.vehicle_id == null || f.odometer == null || f.full_tank == null)) {
    return null;
  }
  const byUser = new Map<string, Fueling[]>();
  for (const f of fuelings) {
    const row = { filled_at: f.created_at, ...f } as Fueling;
    byUser.set(f.user_id, [...(byUser.get(f.user_id) ?? []), row]);
  }
  let count = 0;
  for (const rows of byUser.values()) {
    if (computeFuelings(rows).some((r) => r.computed_km_per_liter)) count += 1;
  }
  return count;
}

const propOf = (props: unknown, key: string): string | null => {
  const value = props && typeof props === "object" ? (props as Record<string, unknown>)[key] : null;
  return typeof value === "string" && value ? value : null;
};

function coreUsage(events: MetricsInput["events"], now: number): BetaMetrics["core"] {
  const recent = events.filter((e) => now - new Date(e.created_at).getTime() <= 7 * DAY);
  const screens: Record<string, Set<string>> = {};
  const formErrors: Record<string, number> = {};
  let formOpened = 0;
  let fuelingsCreated = 0;
  let syncFailures = 0;
  for (const e of recent) {
    if (e.name === "screen_viewed") {
      const screen = propOf(e.props, "screen") ?? "outra";
      (screens[screen] ??= new Set()).add(e.user_id);
    } else if (e.name === "fueling_form_opened") formOpened += 1;
    else if (e.name === "fueling_created" || e.name === "fueling_queued_offline")
      fuelingsCreated += 1;
    else if (e.name === "fueling_form_error") {
      const reason = propOf(e.props, "reason") ?? "outro";
      formErrors[reason] = (formErrors[reason] ?? 0) + 1;
    } else if (e.name === "fueling_sync_failed") syncFailures += 1;
  }
  return {
    screens: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, v.size])),
    formOpened,
    fuelingsCreated,
    formErrors,
    syncFailures,
  };
}

function sourceBreakdown(
  events: MetricsInput["events"],
  fuelingTimes: Map<string, number[]>,
): BetaMetrics["sources"] {
  const sourceOf = new Map<string, string>();
  for (const e of events) {
    if (e.name !== "funnel_signup_completed" || sourceOf.has(e.user_id)) continue;
    sourceOf.set(e.user_id, propOf(e.props, "source") ?? "direto");
  }
  const groups = new Map<string, { signups: number; withFirstFueling: number }>();
  for (const [user, source] of sourceOf) {
    const g = groups.get(source) ?? { signups: 0, withFirstFueling: 0 };
    g.signups += 1;
    if ((fuelingTimes.get(user)?.length ?? 0) >= 1) g.withFirstFueling += 1;
    groups.set(source, g);
  }
  return [...groups.entries()]
    .map(([source, g]) => ({ source, ...g }))
    .sort((a, b) => b.signups - a.signups);
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

export function computeBetaMetrics(input: MetricsInput, weeksBack = 6): BetaMetrics {
  const now = input.now.getTime();
  const signupAt = new Map(input.users.map((u) => [u.id, new Date(u.created_at).getTime()]));

  const fuelingTimes = new Map<string, number[]>();
  for (const f of input.fuelings) {
    const list = fuelingTimes.get(f.user_id) ?? [];
    list.push(new Date(f.created_at).getTime());
    fuelingTimes.set(f.user_id, list);
  }
  for (const list of fuelingTimes.values()) list.sort((a, b) => a - b);

  const withVehicle = new Set(input.vehicles.map((v) => v.user_id));
  const users = input.users.map((u) => u.id);

  let eligible48 = 0;
  let activated48 = 0;
  let eligible21 = 0;
  let reached21 = 0;
  for (const id of users) {
    const signup = signupAt.get(id) ?? now;
    const times = fuelingTimes.get(id) ?? [];
    if (now - signup >= 48 * HOUR) {
      eligible48 += 1;
      if (times[0] !== undefined && times[0] - signup <= 48 * HOUR) activated48 += 1;
    }
    if (now - signup >= 21 * DAY) {
      eligible21 += 1;
      if (times[2] !== undefined && times[2] - signup <= 21 * DAY) reached21 += 1;
    }
  }

  // Semanas: usuários ativos (com qualquer evento) e abastecimentos registrados.
  const weekKeys: string[] = [];
  for (let i = weeksBack - 1; i >= 0; i -= 1) weekKeys.push(weekStart(new Date(now - i * 7 * DAY)));
  const active = new Map(weekKeys.map((k) => [k, new Set<string>()]));
  const fuelingsPerWeek = new Map(weekKeys.map((k) => [k, 0]));
  for (const e of input.events) active.get(weekStart(new Date(e.created_at)))?.add(e.user_id);
  for (const f of input.fuelings) {
    const key = weekStart(new Date(f.created_at));
    // Quem registra abastecimento também está ativo, mesmo sem eventos gravados.
    active.get(key)?.add(f.user_id);
    if (fuelingsPerWeek.has(key)) fuelingsPerWeek.set(key, (fuelingsPerWeek.get(key) ?? 0) + 1);
  }

  const ratings = input.feedback.map((f) => f.rating).filter((r): r is number => !!r);
  const byKind: Record<string, number> = {};
  for (const f of input.feedback) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;

  const vehicleCounts = new Map<string, number>();
  for (const v of input.vehicles) {
    const name = `${v.brand} ${v.model}`.trim();
    vehicleCounts.set(name, (vehicleCounts.get(name) ?? 0) + 1);
  }

  return {
    generatedAt: input.now.toISOString(),
    funnel: {
      signups: users.length,
      withVehicle: users.filter((id) => withVehicle.has(id)).length,
      withFirstFueling: users.filter((id) => (fuelingTimes.get(id)?.length ?? 0) >= 1).length,
      withSecondFueling: users.filter((id) => (fuelingTimes.get(id)?.length ?? 0) >= 2).length,
      withThreeFuelings: users.filter((id) => (fuelingTimes.get(id)?.length ?? 0) >= 3).length,
      withRealConsumption: realConsumptionUsers(input.fuelings),
    },
    core: coreUsage(input.events, now),
    sources: sourceBreakdown(input.events, fuelingTimes),
    activation48h: {
      eligible: eligible48,
      activated: activated48,
      rate: ratio(activated48, eligible48),
    },
    threeIn21Days: { eligible: eligible21, reached: reached21, rate: ratio(reached21, eligible21) },
    signupsLast7Days: input.users.filter((u) => now - new Date(u.created_at).getTime() <= 7 * DAY)
      .length,
    installs: new Set(input.events.filter((e) => e.name === "app_installed").map((e) => e.user_id))
      .size,
    weeks: weekKeys.map((week) => ({
      week,
      activeUsers: active.get(week)?.size ?? 0,
      fuelings: fuelingsPerWeek.get(week) ?? 0,
    })),
    feedback: {
      total: input.feedback.length,
      averageRating: ratings.length
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null,
      byKind,
      latest: [...input.feedback]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15),
    },
    topVehicles: [...vehicleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count })),
  };
}
