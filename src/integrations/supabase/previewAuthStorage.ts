// Sessão de login guardada no navegador. (O intermediário de pré-visualização do Lovable foi
// removido junto com a saída do Lovable.)
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
