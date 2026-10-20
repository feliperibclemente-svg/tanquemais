import { normalizeName } from "@/services/anp";

/* =========================================================================
 * Sugestões do campo de cidade: sem acento e sem diferença de maiúsculas,
 * primeiro as que começam com o que foi digitado, depois as que têm uma
 * palavra começando assim ("goi" → "Aparecida de Goiânia"). Testado em
 * tests/unit/cities.test.ts.
 * ========================================================================= */

export function suggestCities(list: readonly string[], query: string, max = 8): string[] {
  const q = normalizeName(query);
  if (!q) return [];
  const starts: string[] = [];
  const words: string[] = [];
  for (const name of list) {
    const n = normalizeName(name);
    if (n.startsWith(q)) starts.push(name);
    else if (n.includes(` ${q}`)) words.push(name);
  }
  return [...starts, ...words].slice(0, max);
}

/** Nome oficial quando o digitado é a mesma cidade ("aparecida de goiania" → "Aparecida de Goiânia"). */
export function officialCity(list: readonly string[], value: string): string | null {
  const v = normalizeName(value);
  if (!v) return null;
  return list.find((name) => normalizeName(name) === v) ?? null;
}
