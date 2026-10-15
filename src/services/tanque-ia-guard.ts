/**
 * Guarda-corpos da TanqueIA. A IA só pode reescrever fatos calculados; aqui verificamos,
 * de forma determinística, se a frase gerada continua fiel a eles.
 */

/** Todos os números de um texto, normalizados ("R$ 2.980,00" → "2980.00"). */
export function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) =>
    n.replace(/\.(?=\d{3}\b)/g, "").replace(",", "."),
  );
}

const canonical = (n: string) => (n.includes(".") ? n.replace(/0+$/, "").replace(/\.$/, "") : n);

/** Verdadeiro quando todo número citado existe nos fatos (2980 = 2980,00). */
export function numbersAreGrounded(text: string, facts: string[]): boolean {
  const allowed = new Set(facts.flatMap(numbersIn).map(canonical));
  return numbersIn(text).every((n) => allowed.has(canonical(n)));
}

/**
 * Afirmações que os fatos atuais nunca sustentam: economia/ganho (o app ainda não tem
 * referência externa de preço), previsões e promessas. Só são aceitas se algum fato
 * calculado usar o mesmo termo.
 */
const RISKY_TERMS: { label: string; pattern: RegExp }[] = [
  { label: "economia", pattern: /econom|poup|ganh|desconto|lucr/i },
  {
    label: "previsão",
    pattern: /vai gastar|vai pagar|vai economizar|previs|projeç|projet|estimamos/i,
  },
  { label: "promessa", pattern: /garant|com certeza|sempre vai/i },
];

export function checkPhrase(text: string, facts: string[]): { ok: boolean; reason?: string } {
  if (!text || text.length > 400) return { ok: false, reason: "vazio ou longo demais" };
  if (!numbersAreGrounded(text, facts)) return { ok: false, reason: "número fora dos fatos" };
  const factText = facts.join(" ");
  for (const term of RISKY_TERMS) {
    if (term.pattern.test(text) && !term.pattern.test(factText)) {
      return { ok: false, reason: `afirma ${term.label} sem base` };
    }
  }
  return { ok: true };
}
