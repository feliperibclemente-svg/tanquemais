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

  // Qualidade dos dados primeiro: números errados contaminam todo o resto.
  if (o.duplicates > 0 || o.outliers > 0) {
    const parts = [
      o.duplicates > 0
        ? `${o.duplicates === 1 ? "1 registro parece duplicado" : `${o.duplicates} registros parecem duplicados`} e ficou fora das contas`
        : null,
      o.outliers > 0
        ? `${o.outliers === 1 ? "1 trecho teve" : `${o.outliers} trechos tiveram`} consumo fora do seu padrão e não entra nas médias`
        : null,
    ].filter(Boolean);
    out.push({
      id: "data-quality",
      icon: "alert",
      severity: "warning",
      title: "Confira seu histórico",
      body: `${parts.join("; ")}. Verifique no Histórico se foi engano.`,
      action: { label: "Abrir histórico", to: "/historico" },
    });
  }

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
      title: `Custo de combustível por km: ${brl(o.costPerKm)}`,
      body: `Gasto observado: nos ${num(o.totalKm, 0)} km medidos entre tanques cheios você gastou ${brl(measuredCost)} em combustível, ${brl(o.costPerKm)} por km.`,
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
