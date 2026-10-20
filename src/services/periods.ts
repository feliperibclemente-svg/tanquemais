/* =========================================================================
 * Períodos do Histórico (horário local). Semana = segunda a domingo.
 * Testado em tests/unit/periods.test.ts.
 * ========================================================================= */

export const PERIODS = [
  { id: "week", label: "Esta semana" },
  { id: "lastweek", label: "Semana passada" },
  { id: "month", label: "Este mês" },
  { id: "3m", label: "3 meses" },
  { id: "12m", label: "12 meses" },
  { id: "all", label: "Tudo" },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];

/** Segunda-feira 00:00 da semana de `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // domingo = 6
  d.setDate(d.getDate() - offset);
  return d;
}

/** [início, fim) do período; null = sem limite. */
export function periodRange(
  period: PeriodId,
  now = new Date(),
): { start: Date; end: Date | null } | null {
  if (period === "all") return null;
  if (period === "week") return { start: weekStart(now), end: null };
  if (period === "lastweek") {
    const end = weekStart(now);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return { start, end };
  }
  const back = period === "month" ? 0 : period === "3m" ? 2 : 11;
  return { start: new Date(now.getFullYear(), now.getMonth() - back, 1), end: null };
}

export function inPeriod(filledAt: string, range: ReturnType<typeof periodRange>): boolean {
  if (!range) return true;
  const t = new Date(filledAt).getTime();
  return t >= range.start.getTime() && (!range.end || t < range.end.getTime());
}
