/**
 * "Cartão do momento" do Início: entre os assuntos relevantes agora, mostra só um,
 * pela prioridade (como os apps grandes fazem com um destaque por vez).
 * Cada assunto tem uma chave: dispensado, só volta quando a chave muda (novidade).
 */

export type MomentId = "recap" | "reminder" | "oil" | "price-week" | "checkup" | "city-missing";

/** Ordem de prioridade (primeiro = mais importante). */
export const MOMENT_PRIORITY: readonly MomentId[] = [
  "recap",
  "reminder",
  "oil",
  "price-week",
  "checkup",
  "city-missing",
];

export interface MomentCandidate {
  id: MomentId;
  /** Muda quando há novidade (ex.: "anp:2026-10-04:gasolina"). */
  key: string;
}

export function pickMoment(
  candidates: (MomentCandidate | null | false | undefined)[],
  dismissed: ReadonlySet<string>,
): MomentCandidate | null {
  const available = candidates.filter((c): c is MomentCandidate => !!c && !dismissed.has(c.key));
  available.sort((a, b) => MOMENT_PRIORITY.indexOf(a.id) - MOMENT_PRIORITY.indexOf(b.id));
  return available[0] ?? null;
}

const STORAGE = "tanque:moments-dismissed";

export function dismissedMoments(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function dismissMoment(key: string) {
  try {
    const list = [...dismissedMoments(), key].slice(-50);
    localStorage.setItem(STORAGE, JSON.stringify(list));
  } catch {
    /* sem armazenamento: some só nesta visita */
  }
}
