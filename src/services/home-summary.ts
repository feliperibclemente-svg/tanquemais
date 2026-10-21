import { estimatedCostPerKm } from "@/services/cost-estimate";
import { localMonthKey, monthNameOf } from "@/services/recap";
import type { FuelingComputed, Overview } from "@/services/analytics";

/* =========================================================================
 * Números do Início: respondem "quanto custa rodar?" e "melhorei ou piorei?"
 * com o que já é calculado no app (nada novo inventado). Testado em
 * tests/unit/home-summary.test.ts.
 * ========================================================================= */

/** Diferença abaixo disto é tratada como "praticamente igual" (variação normal). */
export const TREND_SAME = 0.03;

/** Custo por km para o Início: o medido; sem ele, o estimado pelo km do painel. */
export function homeCostPerKm(
  stats: Pick<Overview, "costPerKm">,
  rows: FuelingComputed[],
): { value: number; estimated: boolean } | null {
  if (stats.costPerKm) return { value: stats.costPerKm, estimated: false };
  const estimate = estimatedCostPerKm(rows);
  return estimate ? { value: estimate.costPerKm, estimated: true } : null;
}

/**
 * Frase da tendência do consumo (mês do último registro x mês anterior, mesmo combustível).
 * Fala só de consumo: não afirma economia, que depende também de preço e km rodados.
 */
export function consumptionTrendText(
  trend: Overview["consumptionTrend"],
  lastFilledAt: string | null | undefined,
  fuelName: string,
): string | null {
  if (!trend || !lastFilledAt || !(trend.previous > 0) || !(trend.current > 0)) return null;
  const key = localMonthKey(lastFilledAt);
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 2, 15);
  const current = monthNameOf(key);
  const previous = monthNameOf(localMonthKey(d));
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const change = (trend.current - trend.previous) / trend.previous;
  const verdict =
    Math.abs(change) < TREND_SAME
      ? "Praticamente igual."
      : change > 0
        ? `Rendeu ${Math.round(change * 100)}% mais.`
        : `Rendeu ${Math.round(Math.abs(change) * 100)}% menos.`;
  return `Consumo com ${fuelName.toLowerCase()}: ${fmt(trend.current)} km/L em ${current} e ${fmt(trend.previous)} km/L em ${previous}. ${verdict}`;
}
