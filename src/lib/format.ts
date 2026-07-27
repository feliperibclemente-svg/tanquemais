export const brl = (value: number | null | undefined, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value as number) ? (value as number) : 0);

export const num = (value: number | null | undefined, digits = 1) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value as number) ? (value as number) : 0);

export const int = (value: number | null | undefined) => num(value, 0);

export const pct = (value: number | null | undefined, digits = 0) =>
  `${num((value ?? 0) * 100, digits)}%`;

export const km = (value: number | null | undefined) => `${int(value)} km`;
export const kmPerLiter = (value: number | null | undefined) =>
  value == null ? "—" : `${num(value, 1)} km/L`;
export const liters = (value: number | null | undefined) => `${num(value, 1)} L`;

const dtf = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const dtfFull = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short" });

export const shortDate = (iso: string) => dtf.format(new Date(iso));
export const fullDate = (iso: string) => dtfFull.format(new Date(iso));
export const monthLabel = (iso: string) => monthFmt.format(new Date(iso)).replace(".", "");

export function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}

export function inDays(days: number) {
  if (days <= 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${Math.round(days)} dias`;
}

export const monthKey = (iso: string) => iso.slice(0, 7);
