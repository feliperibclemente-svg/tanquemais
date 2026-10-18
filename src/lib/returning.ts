/**
 * Lembra, só neste aparelho, que alguém já entrou no Tanque+ por aqui. Serve apenas para a
 * tela de login não dizer "de volta" para quem nunca entrou. Não guarda e-mail nem nome.
 */
const KEY = "tanque:ja-entrou";

export function markReturning() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* sem armazenamento */
  }
}

export function isReturning(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
