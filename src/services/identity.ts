/**
 * Identidade básica do usuário: nome, sobrenome e data de nascimento.
 * Regras puras (testadas); o banco repete a checagem de maioridade num trigger.
 */

export const MIN_AGE = 18;
export const MAX_AGE = 110;

/** Máscara de data enquanto digita: "15031990" → "15/03/1990". */
export function maskDate(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" (formato do banco); null se a data não existir. */
export function parseBirthDate(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null; // 31/02, 30/13…
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "aaaa-mm-dd" → "dd/mm/aaaa". */
export function formatBirthDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Idade completa em anos numa data (aniversário conta no próprio dia). */
export function ageOn(birthIso: string, today = new Date()): number {
  const [y, m, d] = birthIso.slice(0, 10).split("-").map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export type BirthCheck =
  | { ok: true; iso: string; age: number }
  | { ok: false; reason: "invalid" | "future" | "minor" | "too-old" };

export function checkBirthDate(value: string, today = new Date()): BirthCheck {
  const iso = parseBirthDate(value);
  if (!iso) return { ok: false, reason: "invalid" };
  const age = ageOn(iso, today);
  if (age < 0) return { ok: false, reason: "future" };
  if (age < MIN_AGE) return { ok: false, reason: "minor" };
  if (age > MAX_AGE) return { ok: false, reason: "too-old" };
  return { ok: true, iso, age };
}

/** Faixa etária derivada (mesmos valores aceitos pela coluna age_range). */
export function ageRangeOf(age: number): string {
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

/** "Ana Paula Souza" → { first: "Ana", last: "Paula Souza" } (para pré-preencher). */
export function splitFullName(full: string | null | undefined): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/** Primeiro nome para o app chamar a pessoa. */
export function firstNameOf(
  profile: {
    first_name?: string | null;
    full_name?: string | null;
  } | null,
): string {
  return (profile?.first_name ?? splitFullName(profile?.full_name).first).trim();
}

/** Nome próprio com inicial maiúscula, preservando partículas ("da", "de", "dos"…). */
export function tidyName(value: string): string {
  const lower = new Set(["da", "das", "de", "do", "dos", "e"]);
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) =>
      i > 0 && lower.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");
}

/**
 * Falta completar a identidade? Se o banco ainda não tem as colunas novas (migration não
 * aplicada), a chave nem vem no perfil — aí não bloqueamos ninguém.
 */
export function needsIdentity(
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    birth_date?: string | null;
  } | null,
): boolean {
  if (!profile || !("birth_date" in profile)) return false;
  return !profile.first_name || !profile.last_name || !profile.birth_date;
}
