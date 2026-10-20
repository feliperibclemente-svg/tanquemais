/**
 * Mensagem para a pessoa quando salvar, editar ou excluir falha. O erro técnico vai para
 * a telemetria; aqui só texto claro em português. Erros do próprio app (sem código do
 * banco) já vêm escritos para a pessoa e são mantidos.
 */
export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline || /failed to fetch|network|load failed|timeout/i.test(raw)) {
    return "Sem conexão com a internet. Tente de novo quando a conexão voltar.";
  }
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : "";
  if (code === "42501" || /row-level security/i.test(message)) {
    return "Não foi possível salvar: esse registro não pertence à sua conta.";
  }
  // RAISE EXCEPTION das nossas funções e gatilhos: já escrito em português para a pessoa.
  if (code === "P0001" && message && message.length <= 200) return message;
  if (code === "23505") return "Esse registro já existe.";
  if (code === "23514" || code === "22003") {
    return "Algum valor está fora do permitido. Confira os campos.";
  }
  if (typeof code === "string" || !message || message.length > 200) {
    return "Não conseguimos concluir agora. Tente de novo em instantes.";
  }
  return message;
}
