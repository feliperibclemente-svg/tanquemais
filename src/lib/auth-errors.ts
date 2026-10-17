/** Traduz as mensagens do Supabase Auth para português, com orientação do que fazer. */
export function authErrorMessage(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já tem conta. Entre ou use “Esqueci minha senha”.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes"))
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "A nova senha precisa ser diferente da anterior.";
  if (m.includes("password should be") || m.includes("weak password"))
    return "Escolha uma senha mais forte, com pelo menos 8 caracteres.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("link")))
    return "O link expirou ou já foi usado. Peça um novo.";
  if (m.includes("network") || m.includes("fetch"))
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}
