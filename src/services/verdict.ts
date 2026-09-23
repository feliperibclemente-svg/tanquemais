/**
 * Responde a pergunta central do Tanque+: "eu economizei?".
 *
 * Regra de ouro: nunca apresentar economia sem dizer a referência usada.
 * Se não houver base de comparação confiável, dizemos isso com todas as letras.
 */
import type { StationWithPrice } from "@/repositories";
import { brl } from "@/lib/format";
import type { FuelingComputed } from "./analytics";

export type VerdictTone = "good" | "bad" | "neutral";

export interface PriceVerdict {
  tone: VerdictTone;
  /** Frase curta: "Bom abastecimento". */
  headline: string;
  /** Explicação em linguagem simples, sempre citando a referência. */
  detail: string;
  /** Nome da referência usada ("sua média dos últimos 5 abastecimentos"). */
  reference: string | null;
  /** Preço de referência por litro. */
  referencePrice: number | null;
  /** Diferença por litro (negativa = pagou menos). */
  deltaPerLiter: number | null;
  /** Economia (ou custo extra) estimado no volume abastecido. */
  amount: number | null;
}

const REFERENCE_WINDOW = 5;
/** Com uma única referência um registro digitado errado viraria "economia" absurda. */
const MIN_REFERENCES = 2;

/** Mediana: resiste a um preço digitado errado, ao contrário da média. */
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

/** Preço habitual recente do próprio usuário para o mesmo combustível. */
export function recentAveragePrice(
  history: FuelingComputed[],
  fuelTypeId: string | null,
): { price: number; count: number } | null {
  const prices = history
    .filter((r) => (fuelTypeId ? r.fuel_type_id === fuelTypeId : true))
    .map((r) => Number(r.price_per_liter))
    .filter((p) => p > 0)
    .slice(0, REFERENCE_WINDOW);

  if (prices.length < MIN_REFERENCES) return null;
  return { price: median(prices), count: prices.length };
}

/**
 * Compara o preço pago com a média recente do usuário.
 * `history` deve conter apenas abastecimentos ANTERIORES ao avaliado (mais recente primeiro).
 */
export function priceVerdict(
  history: FuelingComputed[],
  current: { pricePerLiter: number; liters: number; fuelTypeId: string | null },
): PriceVerdict {
  const reference = recentAveragePrice(history, current.fuelTypeId);

  if (!reference || !current.pricePerLiter) {
    return {
      tone: "neutral",
      headline: "Ainda sem comparação",
      detail:
        "Este é um dos seus primeiros abastecimentos com esse combustível. Depois de mais alguns registros conseguimos dizer se o preço foi bom.",
      reference: null,
      referencePrice: null,
      deltaPerLiter: null,
      amount: null,
    };
  }

  const label =
    reference.count === 1
      ? "seu abastecimento anterior"
      : `sua média dos últimos ${reference.count} abastecimentos`;

  const delta = current.pricePerLiter - reference.price;
  const amount = Math.abs(delta) * (current.liters || 0);

  // Diferenças abaixo de 1 centavo por litro não mudam decisão nenhuma.
  if (Math.abs(delta) < 0.01) {
    return {
      tone: "neutral",
      headline: "Preço na média",
      detail: `Você pagou praticamente o mesmo que ${label}.`,
      reference: label,
      referencePrice: reference.price,
      deltaPerLiter: delta,
      amount: 0,
    };
  }

  if (delta < 0) {
    return {
      tone: "good",
      headline: "Bom abastecimento",
      detail: `Você pagou ${brl(Math.abs(delta))}/L menos que ${label}.`,
      reference: label,
      referencePrice: reference.price,
      deltaPerLiter: delta,
      amount,
    };
  }

  return {
    tone: "bad",
    headline: "Pagou acima da sua média",
    detail: `Você pagou ${brl(delta)}/L a mais que ${label}.`,
    reference: label,
    referencePrice: reference.price,
    deltaPerLiter: delta,
    amount,
  };
}

/** Veredito de cada abastecimento da lista, comparando com os anteriores dele. */
export function historyVerdicts(rows: FuelingComputed[]): Map<string, PriceVerdict> {
  const map = new Map<string, PriceVerdict>();
  rows.forEach((row, index) => {
    map.set(
      row.id,
      priceVerdict(rows.slice(index + 1), {
        pricePerLiter: Number(row.price_per_liter),
        liters: Number(row.liters),
        fuelTypeId: row.fuel_type_id,
      }),
    );
  });
  return map;
}

export interface StationOpportunity {
  stationName: string;
  price: number;
  amount: number;
}

/** Posto conhecido com preço abaixo do que a pessoa acabou de pagar. */
export function stationOpportunity(
  stations: StationWithPrice[],
  fuelTypeId: string | null,
  paidPricePerLiter: number,
  liters: number,
): StationOpportunity | null {
  let best: { name: string; price: number } | null = null;

  for (const station of stations) {
    for (const price of station.station_prices ?? []) {
      if (fuelTypeId && price.fuel_type_id !== fuelTypeId) continue;
      const value = Number(price.price);
      if (!(value > 0)) continue;
      if (!best || value < best.price) best = { name: station.name, price: value };
    }
  }

  if (!best || !paidPricePerLiter || best.price >= paidPricePerLiter - 0.01) return null;

  return {
    stationName: best.name,
    price: best.price,
    amount: (paidPricePerLiter - best.price) * (liters || 0),
  };
}

/**
 * Deriva o trio valor / preço / litros a partir de dois campos quaisquer.
 * O usuário digita o que sabe, o Tanque+ completa o resto.
 */
export function deriveAmounts(input: { total: number; price: number; liters: number }) {
  const { total, price, liters } = input;
  if (total > 0 && price > 0)
    return { total, price, liters: total / price, derived: "liters" as const };
  if (liters > 0 && price > 0)
    return { total: liters * price, price, liters, derived: "total" as const };
  if (total > 0 && liters > 0)
    return { total, price: total / liters, liters, derived: "price" as const };
  return { total, price, liters, derived: null };
}
