/**
 * Métricas do beta, calculadas a partir das linhas brutas do banco.
 * Função pura: recebe as listas e devolve só números agregados (sem e-mail ou nome).
 */

export interface MetricsInput {
  now: Date;
  users: { id: string; created_at: string }[];
  vehicles: { user_id: string; brand: string; model: string }[];
  fuelings: { user_id: string; created_at: string }[];
  events: { user_id: string; name: string; created_at: string }[];
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
    withThreeFuelings: number;
  };
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
      withThreeFuelings: users.filter((id) => (fuelingTimes.get(id)?.length ?? 0) >= 3).length,
    },
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
