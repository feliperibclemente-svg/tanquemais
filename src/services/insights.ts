import { brl, num } from "@/lib/format";
import { ETHANOL_BREAKEVEN_RATIO } from "@/constants/app";
import type { Insight } from "@/types/domain";
import type { Overview, SavingsOpportunity } from "./analytics";

/**
 * Insights determinísticos. Toda a matemática já vem pronta — a IA apenas
 * reescreve o texto do insight principal, nunca inventa números.
 */
export function buildInsights(o: Overview, savings: SavingsOpportunity): Insight[] {
  const out: Insight[] = [];

  if (o.count < 2) {
    out.push({
      id: "empty",
      icon: "sparkles",
      severity: "info",
      title: "Vamos começar",
      body: "Registre mais abastecimentos para receber recomendações personalizadas.",
      action: { label: "Registrar abastecimento", to: "/abastecer" },
    });
    return out;
  }

  // Insight de posto mais barato desativado no beta (sem base de postos confiável).
  void savings;

  const trend = o.consumptionTrend;
  if (trend) {
    const diff = ((trend.current - trend.previous) / trend.previous) * 100;
    if (Math.abs(diff) >= 3) {
      out.push({
        id: "trend",
        icon: diff > 0 ? "trending-up" : "trending-down",
        severity: diff > 0 ? "good" : "warning",
        title:
          diff > 0
            ? `Consumo ${num(Math.abs(diff))}% melhor`
            : `Consumo ${num(Math.abs(diff))}% pior`,
        body: `Neste mês: ${num(trend.current)} km/L. No mês anterior: ${num(trend.previous)} km/L.`,
      });
    }
  }

  if (o.monthDelta != null) {
    const day = new Date().getDate();
    out.push({
      id: "spend",
      icon: "wallet",
      severity: "info",
      title:
        o.monthDelta >= 0
          ? `Gasto ${num(o.monthDelta * 100)}% acima do mesmo período`
          : `Gasto ${num(Math.abs(o.monthDelta) * 100)}% abaixo do mesmo período`,
      body: `Gasto até o dia ${day}: ${brl(o.monthSpend)}. No mesmo período do mês passado: ${brl(o.previousMonthSpend)}.`,
    });
  }

  if (o.costPerKm) {
    const measuredCost = o.costPerKm * o.totalKm;
    out.push({
      id: "cost",
      icon: "route",
      severity: "info",
      title: `Custo por km: ${brl(o.costPerKm)}`,
      body: `Nos trechos medidos (${num(o.totalKm, 0)} km) você gastou ${brl(measuredCost)}: ${brl(o.costPerKm)} por km.`,
    });
  }

  return out;
}

/** Regra dos 70%: vale a pena abastecer com etanol? */
export function ethanolAdvice(gasoline: number, ethanol: number) {
  const ratio = gasoline > 0 ? ethanol / gasoline : 1;
  return {
    ratio,
    worth: ratio <= ETHANOL_BREAKEVEN_RATIO,
    breakeven: gasoline * ETHANOL_BREAKEVEN_RATIO,
  };
}
