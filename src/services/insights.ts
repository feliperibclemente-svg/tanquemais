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

  if (savings.amount > 0.5 && savings.stationName) {
    out.push({
      id: "savings",
      icon: "piggy-bank",
      severity: "good",
      title: `Economize ${brl(savings.amount)} no próximo tanque`,
      body: `O ${savings.stationName} está a ${brl(savings.cheapestPrice ?? 0)}/L — ${brl(
        (savings.referencePrice ?? 0) - (savings.cheapestPrice ?? 0),
      )} abaixo do que você costuma pagar.`,
      savings: savings.amount,
      action: { label: "Ver postos", to: "/postos" },
    });
  }

  const [prev, current] = o.series.slice(-2);
  if (prev?.consumo && current?.consumo) {
    const diff = ((current.consumo - prev.consumo) / prev.consumo) * 100;
    if (Math.abs(diff) >= 3) {
      out.push({
        id: "trend",
        icon: diff > 0 ? "trending-up" : "trending-down",
        severity: diff > 0 ? "good" : "warning",
        title:
          diff > 0
            ? `Consumo ${num(Math.abs(diff))}% melhor`
            : `Consumo ${num(Math.abs(diff))}% pior`,
        body:
          diff > 0
            ? `Seu carro está fazendo ${num(current.consumo)} km/L, acima dos ${num(prev.consumo)} km/L do mês passado.`
            : `Você caiu para ${num(current.consumo)} km/L. Calibragem, filtro de ar e trânsito pesado costumam explicar essa queda.`,
      });
    }
  }

  if (o.monthDelta != null && Math.abs(o.monthDelta) >= 0.05) {
    out.push({
      id: "spend",
      icon: "wallet",
      severity: o.monthDelta > 0 ? "warning" : "good",
      title:
        o.monthDelta > 0
          ? `Gasto ${num(o.monthDelta * 100)}% acima do mês passado`
          : `Gasto ${num(Math.abs(o.monthDelta) * 100)}% abaixo do mês passado`,
      body: `Você já gastou ${brl(o.monthSpend)} neste mês contra ${brl(o.previousMonthSpend)} no anterior.`,
    });
  }

  if (o.costPerKm) {
    out.push({
      id: "cost",
      icon: "route",
      severity: "info",
      title: `Custo por km: ${brl(o.costPerKm)}`,
      body: `Com ${num(o.totalKm, 0)} km rodados e ${brl(o.totalSpend)} abastecidos, esse é o seu custo real de combustível.`,
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
