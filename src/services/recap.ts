import type { FuelingComputed } from "@/services/analytics";
import { chooseReference, type PriceReferenceRow } from "@/services/anp";
import { brl, num } from "@/lib/format";
import { FUEL_LABEL } from "@/constants/app";

/* =========================================================================
 * Retrospectiva do mês (no estilo das retrospectivas de apps de música):
 * uma tela por número, só com o que a pessoa registrou de verdade.
 * Funções puras, testadas em tests/unit/recap.test.ts.
 * ========================================================================= */

export type RecapTheme = "verde" | "noite" | "lima" | "sol" | "claro";

export interface RecapSlide {
  id: string;
  theme: RecapTheme;
  /** Linha pequena acima do número ("Em outubro"). */
  eyebrow: string;
  /** O número grande ("R$ 642"). Vazio na abertura. */
  big: string;
  /** Frase principal. */
  title: string;
  /** Complemento curto (opcional). */
  caption?: string;
}

export interface MonthlyRecap {
  /** "2026-10" */
  key: string;
  /** "outubro" */
  monthName: string;
  /** Mês ainda em andamento ("até agora"). */
  partial: boolean;
  slides: RecapSlide[];
  /** Linhas do resumo final (também usadas na imagem do resumo). */
  summary: { label: string; value: string }[];
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Mês no fuso do aparelho ("2026-10"). */
export function localMonthKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthNameOf(key: string): string {
  return MONTHS.at(Number(key.slice(5, 7)) - 1) ?? key;
}

/**
 * Qual mês mostrar: nos primeiros dias do mês, o mês anterior (se teve registro);
 * senão o mês atual, se já tem pelo menos 2 abastecimentos ("até agora").
 */
export function recapMonthFor(
  rows: Pick<FuelingComputed, "filled_at" | "issue">[],
  now = new Date(),
): { key: string; partial: boolean } | null {
  const valid = rows.filter((r) => r.issue !== "duplicate");
  const current = localMonthKey(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const previous = localMonthKey(prevDate);
  const count = (key: string) => valid.filter((r) => localMonthKey(r.filled_at) === key).length;
  if (now.getDate() <= 10 && count(previous) > 0) return { key: previous, partial: false };
  if (count(current) >= 2) return { key: current, partial: true };
  if (count(previous) > 0) return { key: previous, partial: false };
  return null;
}

type RefRow = Pick<
  PriceReferenceRow,
  | "uf"
  | "municipio"
  | "municipio_label"
  | "fuel_type_id"
  | "avg_price"
  | "week_start"
  | "week_end"
  | "stations"
> & { scope: string };

export function buildMonthlyRecap(o: {
  rows: FuelingComputed[];
  key: string;
  partial: boolean;
  /** "Seu Argo", "Sua Biz" */
  vehicleYour: string;
  references?: RefRow[];
  place?: { uf: string | null | undefined; city: string | null | undefined };
}): MonthlyRecap {
  const monthName = monthNameOf(o.key);
  const when = o.partial ? `Em ${monthName}, até agora` : `Em ${monthName}`;
  const inMonth = o.rows.filter(
    (r) => r.issue !== "duplicate" && localMonthKey(r.filled_at) === o.key,
  );
  const slides: RecapSlide[] = [];
  const summary: MonthlyRecap["summary"] = [];

  slides.push({
    id: "abertura",
    theme: "noite",
    eyebrow: "Retrospectiva Tanque+",
    big: "",
    title: o.partial ? `Seu ${monthName} até agora` : `Seu ${monthName} no Tanque+`,
    caption: "Os seus números, do jeito que aconteceram.",
  });

  // Gasto e abastecimentos
  const spend = inMonth.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
  const liters = inMonth.reduce((s, r) => s + (Number(r.liters) || 0), 0);
  const count = inMonth.length;
  if (count > 0) {
    slides.push({
      id: "gasto",
      theme: "verde",
      eyebrow: when,
      big: brl(spend, 0),
      title: `em ${count} ${count === 1 ? "abastecimento" : "abastecimentos"}`,
      caption: `${num(liters, 0)} litros no total.`,
    });
    summary.push({ label: "Gasto", value: brl(spend, 0) });
    summary.push({ label: "Abastecimentos", value: String(count) });
  }

  // Consumo real: trechos tanque cheio → tanque cheio que terminaram no mês
  const measured = inMonth.filter(
    (r) => r.computed_km_per_liter && r.distance && r.interval_liters,
  );
  const distance = measured.reduce((s, r) => s + (r.distance ?? 0), 0);
  const intervalLiters = measured.reduce((s, r) => s + (r.interval_liters ?? 0), 0);
  const intervalCost = measured.reduce((s, r) => s + (r.interval_cost ?? 0), 0);
  if (distance > 0 && intervalLiters > 0) {
    const kml = distance / intervalLiters;
    slides.push({
      id: "consumo",
      theme: "lima",
      eyebrow: "Consumo real, medido por você",
      big: `${num(kml, 1)} km/L`,
      title: `${o.vehicleYour} fez isso de verdade`,
      caption: `Em ${num(distance, 0)} km medidos entre tanques cheios.`,
    });
    summary.push({ label: "Consumo real", value: `${num(kml, 1)} km/L` });
    if (intervalCost > 0) {
      const perKm = intervalCost / distance;
      slides.push({
        id: "custo-km",
        theme: "sol",
        eyebrow: "Cada quilômetro custou",
        big: brl(perKm),
        title: "de combustível por km rodado",
        caption: `A cada 100 km, cerca de ${brl(perKm * 100, 0)}.`,
      });
      summary.push({ label: "Custo por km", value: brl(perKm) });
    }
  }

  // Preço x média da cidade (ANP)
  if (o.references?.length && o.place) {
    const compared = inMonth
      .map((r) => {
        const ref = chooseReference(o.references!, o.place!, r.fuel_type_id, r.filled_at);
        return ref ? { paid: Number(r.price_per_liter), ref } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.paid > 0);
    if (compared.length > 0) {
      const below = compared.filter((c) => c.paid < c.ref.avgPrice - 0.005).length;
      const where = compared[0].ref.place;
      slides.push({
        id: "cidade",
        theme: below > 0 ? "claro" : "noite",
        eyebrow: `Comparado com a média de ${where}`,
        big: `${below} de ${compared.length}`,
        title: "abastecimentos abaixo da média da cidade",
        caption:
          below > 0
            ? "Média semanal da ANP para o mesmo combustível."
            : "Dá para pesquisar mais. Média semanal da ANP para o mesmo combustível.",
      });
      summary.push({ label: "Abaixo da média", value: `${below} de ${compared.length}` });
    }
  }

  // Melhor preço do mês: só entre abastecimentos do mesmo combustível (etanol é sempre
  // mais barato por litro que gasolina; misturar daria um "melhor preço" enganoso).
  const priced = inMonth.filter((r) => Number(r.price_per_liter) > 0);
  const byFuel = new Map<string, typeof priced>();
  for (const r of priced) byFuel.set(r.fuel_type_id, [...(byFuel.get(r.fuel_type_id) ?? []), r]);
  const mainFuel = [...byFuel.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (mainFuel && mainFuel[1].length >= 2) {
    const best = mainFuel[1].reduce((a, b) =>
      Number(b.price_per_liter) < Number(a.price_per_liter) ? b : a,
    );
    const fuel = FUEL_LABEL[best.fuel_type_id] ?? best.fuel_type_id;
    const d = new Date(best.filled_at);
    slides.push({
      id: "melhor-preco",
      theme: "verde",
      eyebrow: `Seu melhor preço de ${fuel.toLowerCase()} no mês`,
      big: `${brl(Number(best.price_per_liter))}`,
      title: `por litro, em ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
    summary.push({
      label: `Melhor preço (${fuel})`,
      value: `${brl(Number(best.price_per_liter))}/L`,
    });
  }

  // Resumo só quando acrescenta algo (3 números ou mais).
  if (summary.length >= 3) {
    slides.push({
      id: "resumo",
      theme: "verde",
      eyebrow: o.partial ? `${capitalize(monthName)}, até agora` : capitalize(monthName),
      big: "",
      title: "Meu mês no Tanque+",
    });
  }

  return { key: o.key, monthName, partial: o.partial, slides, summary };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
