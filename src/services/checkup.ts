import type { CheckupFinding, CheckupQuestion } from "@/content/checkup";
import type { FuelingComputed } from "@/services/analytics";

/* =========================================================================
 * Check-up do Teo: regras puras (sem tela, sem banco), testadas em tests/unit.
 * ========================================================================= */

export type CheckupAnswers = Record<string, string>;

/** Queda de consumo que vale comentar: 15% abaixo do habitual do mesmo combustível. */
export const CONSUMPTION_DROP = 0.15;
/** Trechos anteriores necessários para existir um "habitual". */
const MIN_PREVIOUS = 3;

export interface ConsumptionDrop {
  last: number;
  typical: number;
  /** 0,18 = 18% abaixo do habitual. */
  drop: number;
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Compara o último trecho medido (tanque cheio a tanque cheio) com a mediana dos anteriores
 * no mesmo combustível. Trechos fora do padrão (provável erro de digitação) já ficam de fora
 * em computeFuelings, então quedas enormes não aparecem aqui.
 */
export function consumptionDrop(rows: FuelingComputed[]): ConsumptionDrop | null {
  const measured = rows.filter((r) => r.computed_km_per_liter && !r.issue);
  const lastRow = measured[0];
  if (!lastRow) return null;
  const previous = measured
    .slice(1)
    .filter((r) => r.fuel_type_id === lastRow.fuel_type_id)
    .map((r) => r.computed_km_per_liter!);
  if (previous.length < MIN_PREVIOUS) return null;
  const typical = median(previous);
  const last = lastRow.computed_km_per_liter!;
  const drop = (typical - last) / typical;
  return drop >= CONSUMPTION_DROP ? { last, typical, drop } : null;
}

export type OilState =
  | { state: "unknown" }
  | { state: "ok"; remaining: number; dueKm: number }
  | { state: "soon"; remaining: number; dueKm: number }
  | { state: "due"; over: number; dueKm: number };

/** Situação da troca de óleo pelo km. "Perto" = faltam 10% do intervalo ou menos. */
export function oilStatus(o: {
  lastKm: number | null | undefined;
  intervalKm: number | null | undefined;
  currentKm: number | null | undefined;
}): OilState {
  const last = Number(o.lastKm);
  const interval = Number(o.intervalKm);
  const current = Number(o.currentKm);
  if (!(last > 0) || !(interval > 0) || !(current > 0) || current < last) {
    return { state: "unknown" };
  }
  const dueKm = last + interval;
  const remaining = dueKm - current;
  if (remaining <= 0) return { state: "due", over: -remaining, dueKm };
  if (remaining <= interval * 0.1) return { state: "soon", remaining, dueKm };
  return { state: "ok", remaining, dueKm };
}

const kmFmt = (km: number) => `${Math.round(km).toLocaleString("pt-BR")} km`;
const kmlFmt = (v: number) => `${v.toFixed(1).replace(".", ",")} km/L`;

export interface CheckupResult {
  findings: CheckupFinding[];
  /** Orientações neutras (respostas "Não sei"). */
  notes: string[];
}

/** Junta respostas, consumo e óleo. Alertas primeiro; sem nada, lista vazia. */
export function evaluateCheckup(o: {
  questions: CheckupQuestion[];
  answers: CheckupAnswers;
  consumption: ConsumptionDrop | null;
  oil: OilState;
}): CheckupResult {
  const findings: CheckupFinding[] = [];
  const notes: string[] = [];

  for (const q of o.questions) {
    const option = q.options.find((opt) => opt.value === o.answers[q.id]);
    if (option?.finding) findings.push({ id: q.id, ...option.finding });
    else if (option?.note) notes.push(option.note);
  }

  if (o.oil.state === "due") {
    findings.push({
      id: "oleo",
      severity: "conferir",
      title: "Troca de óleo passou do prazo",
      body: `Pelo seu registro, a troca era aos ${kmFmt(o.oil.dueKm)} e já passou ${kmFmt(o.oil.over)}. Óleo vencido protege menos o motor.`,
      ask: "trocar o óleo e o filtro de óleo",
      symptom: `troca de óleo vencida há ${kmFmt(o.oil.over)}`,
    });
  } else if (o.oil.state === "soon") {
    findings.push({
      id: "oleo",
      severity: "conferir",
      title: "Troca de óleo chegando",
      body: `Faltam cerca de ${kmFmt(o.oil.remaining)} para a troca (aos ${kmFmt(o.oil.dueKm)}). Dá para agendar com calma.`,
      ask: "trocar o óleo e o filtro de óleo",
      symptom: `troca de óleo prevista aos ${kmFmt(o.oil.dueKm)}`,
    });
  }

  if (o.consumption) {
    const pct = Math.round(o.consumption.drop * 100);
    findings.push({
      id: "consumo",
      severity: "conferir",
      title: "Consumo abaixo do seu normal",
      body: `No último trecho você fez ${kmlFmt(o.consumption.last)}, ${pct}% abaixo do seu habitual (${kmlFmt(o.consumption.typical)}). Trânsito e ar-condicionado também pesam, mas vale conferir calibragem, filtro de ar e velas.`,
      ask: "verificar calibragem dos pneus, filtro de ar e velas",
      symptom: `consumo ${pct}% abaixo do habitual`,
    });
  }

  const order = { urgente: 0, conferir: 1 } as const;
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { findings, notes };
}

/** Texto para copiar ou mandar pelo WhatsApp para a oficina. */
export function workshopSummary(o: {
  vehicle: string;
  currentKm: number | null;
  findings: CheckupFinding[];
  oilLastKm: number | null;
}): string {
  const head = o.currentKm ? `${o.vehicle}, ${kmFmt(o.currentKm)}.` : `${o.vehicle}.`;
  const items = o.findings
    .filter((f) => f.ask)
    .map((f) => `• ${capitalize(f.ask)}${f.symptom ? ` (${f.symptom})` : ""}.`);
  const lines = [head];
  if (items.length) lines.push("", "Peço, por favor:", ...items);
  if (o.oilLastKm) lines.push("", `Última troca de óleo: ${kmFmt(o.oilLastKm)}.`);
  lines.push("", "Resumo feito no Tanque+.");
  return lines.join("\n");
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
