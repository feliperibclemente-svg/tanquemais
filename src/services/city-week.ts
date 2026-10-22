import { ETHANOL_BREAKEVEN_RATIO } from "@/constants/app";
import { brl } from "@/lib/format";
import { chooseReference, type ChosenReference } from "@/services/anp";

/* =========================================================================
 * "Sua cidade nesta semana": o que a pesquisa semanal da ANP diz sobre a
 * cidade (ou o estado) da pessoa. Só dados oficiais já importados; a única
 * conta extra é a diferença entre postos multiplicada pelo tanque cadastrado.
 * Testado em tests/unit/city-week.test.ts.
 * ========================================================================= */

type Refs = Parameters<typeof chooseReference>[0];
type Place = Parameters<typeof chooseReference>[1];

export interface CityWeek {
  ref: ChosenReference;
  /** Média desta semana menos a da pesquisa anterior no mesmo lugar (até 2 semanas antes). */
  change: number | null;
  /** Etanol ÷ gasolina na mesma semana e no mesmo lugar (só para quem usa um dos dois). */
  ethanolRatio: number | null;
  /** Maior menos menor preço pesquisado na semana, por litro (ou m³). */
  spread: number | null;
}

const DAY = 86_400_000;
const FLEX_FUELS = ["gasolina", "gasolina_aditivada", "etanol"];
const round2 = (v: number) => Math.round(v * 100) / 100;

export function cityWeek(
  refs: Refs,
  place: Place,
  fuelTypeId: string,
  now = new Date(),
): CityWeek | null {
  const ref = chooseReference(refs, place, fuelTypeId, now);
  if (!ref) return null;

  // Pesquisa anterior: a mais recente que começou antes desta, no mesmo lugar.
  const dayBefore = new Date(Date.parse(`${ref.weekStart}T12:00:00`) - DAY);
  const prev = chooseReference(refs, place, fuelTypeId, dayBefore);
  const prevOk =
    prev &&
    prev.scope === ref.scope &&
    prev.place === ref.place &&
    Date.parse(ref.weekStart) - Date.parse(prev.weekStart) <= 14 * DAY;
  const change = prevOk ? round2(ref.avgPrice - prev.avgPrice) : null;

  let ethanolRatio: number | null = null;
  if (FLEX_FUELS.includes(fuelTypeId)) {
    const gas = chooseReference(refs, place, "gasolina", now);
    const eth = chooseReference(refs, place, "etanol", now);
    if (
      gas &&
      eth &&
      gas.weekStart === eth.weekStart &&
      gas.scope === eth.scope &&
      gas.avgPrice > 0
    ) {
      ethanolRatio = eth.avgPrice / gas.avgPrice;
    }
  }

  const spread =
    ref.minPrice != null && ref.maxPrice != null && ref.maxPrice > ref.minPrice
      ? round2(ref.maxPrice - ref.minPrice)
      : null;

  return { ref, change, ethanolRatio, spread };
}

/** Frases do cartão, na ordem: preço e variação, etanol, diferença entre postos. */
export function cityWeekLines(cw: CityWeek, tankLiters: number | null | undefined): string[] {
  const { ref } = cw;
  const lines: string[] = [];
  const fuel = ref.fuelName.charAt(0).toUpperCase() + ref.fuelName.slice(1);
  const price = `${fuel}: ${brl(ref.avgPrice)}/${ref.unit}`;
  if (cw.change === null) lines.push(`${price}.`);
  else if (Math.abs(cw.change) < 0.01) lines.push(`${price}, igual à semana passada.`);
  else
    lines.push(
      `${price}, ${brl(Math.abs(cw.change))} ${cw.change > 0 ? "a mais" : "a menos"} que na semana passada.`,
    );

  if (cw.ethanolRatio !== null) {
    const pct = Math.round(cw.ethanolRatio * 100);
    lines.push(
      cw.ethanolRatio <= ETHANOL_BREAKEVEN_RATIO
        ? `Etanol a ${pct}% da gasolina: o etanol compensa (regra dos 70%).`
        : `Etanol a ${pct}% da gasolina: a gasolina compensa (regra dos 70%).`,
    );
  }

  if (cw.spread !== null) {
    const tank = tankLiters && tankLiters > 0 ? tankLiters : null;
    const perTank =
      tank && ref.unit === "L"
        ? `, cerca de ${brl(cw.spread * tank, 0)} no seu tanque de ${Math.round(tank)}\u00a0L`
        : "";
    lines.push(`Do posto mais barato ao mais caro: ${brl(cw.spread)}/${ref.unit}${perTank}.`);
  }
  return lines;
}

/** Versão curta para o Início: os mesmos três fatos, sem frase explicativa. */
export function cityWeekShort(cw: CityWeek, tankLiters: number | null | undefined): string[] {
  const { ref } = cw;
  const fuel = ref.fuelName.charAt(0).toUpperCase() + ref.fuelName.slice(1);
  const change =
    cw.change === null || Math.abs(cw.change) < 0.01
      ? ""
      : ` (${cw.change > 0 ? "+" : "−"}${brl(Math.abs(cw.change))} na semana)`;
  const lines = [`${fuel} ${brl(ref.avgPrice)}/${ref.unit}${change}`];
  if (cw.ethanolRatio !== null) {
    const pct = Math.round(cw.ethanolRatio * 100);
    lines.push(
      cw.ethanolRatio <= ETHANOL_BREAKEVEN_RATIO
        ? `Etanol compensa (${pct}% da gasolina)`
        : `Gasolina compensa (etanol a ${pct}%)`,
    );
  }
  if (cw.spread !== null) {
    const tank = tankLiters && tankLiters > 0 && ref.unit === "L" ? tankLiters : null;
    lines.push(
      `Até ${brl(cw.spread)}/${ref.unit} entre postos${tank ? ` (≈ ${brl(cw.spread * tank, 0)} no tanque)` : ""}`,
    );
  }
  return lines;
}
