/** Constantes globais do Tanque+. Nenhum valor mágico deve viver em componentes. */

export const APP_NAME = "Tanque+";
export const APP_TAGLINE = "Assistente inteligente de economia automotiva";

export const FUEL_TYPES = [
  { id: "gasolina", label: "Gasolina comum", short: "Gasolina", unit: "L" },
  { id: "gasolina_aditivada", label: "Gasolina aditivada", short: "Aditivada", unit: "L" },
  { id: "etanol", label: "Etanol", short: "Etanol", unit: "L" },
  { id: "diesel", label: "Diesel S10", short: "Diesel", unit: "L" },
  { id: "gnv", label: "GNV", short: "GNV", unit: "m³" },
] as const;

export type FuelTypeId = (typeof FUEL_TYPES)[number]["id"];

export const FUEL_LABEL: Record<string, string> = Object.fromEntries(
  FUEL_TYPES.map((f) => [f.id, f.short]),
);

/** Regra dos 70%: etanol compensa quando custa até 70% do preço da gasolina. */
export const ETHANOL_BREAKEVEN_RATIO = 0.7;

/** Níveis de gamificação — XP acumulado necessário para cada nível. */
export const LEVELS = [
  { level: 1, xp: 0, title: "Motorista Iniciante" },
  { level: 2, xp: 300, title: "Motorista Atento" },
  { level: 3, xp: 800, title: "Economista de Bordo" },
  { level: 4, xp: 1600, title: "Caçador de Preços" },
  { level: 5, xp: 3000, title: "Mestre da Economia" },
  { level: 6, xp: 5200, title: "Lenda do Tanque+" },
] as const;

export function levelFromXp(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp);
  const span = next ? next.xp - current.xp : 1;
  const progress = next ? Math.min(1, (xp - current.xp) / span) : 1;
  return { ...current, next: next ?? null, progress };
}

export const XP_RULES = {
  fueling: 40,
  sharePrice: 25,
  confirmPrice: 15,
  review: 20,
  photo: 10,
} as const;

/** Confiabilidade do posto a partir do número de confirmações da comunidade. */
export function reliabilityFromConfirmations(confirmations: number) {
  if (confirmations >= 12) return { label: "Muito alta", tone: "good" as const, score: 4 };
  if (confirmations >= 6) return { label: "Alta", tone: "good" as const, score: 3 };
  if (confirmations >= 3) return { label: "Média", tone: "info" as const, score: 2 };
  return { label: "Em verificação", tone: "warning" as const, score: 1 };
}

export const QUERY_STALE_TIME = 60_000;
export const PAGE_SIZE = 20;
