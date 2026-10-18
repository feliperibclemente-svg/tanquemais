/**
 * Provedor de IA (API no formato OpenAI de chat/completions):
 * - Fora do Lovable: AI_API_KEY (padrão: Google Gemini; AI_BASE_URL e AI_MODEL trocam o provedor).
 * - No Lovable: LOVABLE_API_KEY, pelo gateway deles.
 * Sem chave, o app mostra o texto calculado.
 */
export function aiProvider() {
  const own = process.env.AI_API_KEY;
  if (own) {
    const base = (
      process.env.AI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai"
    ).replace(/\/+$/, "");
    return {
      url: `${base}/chat/completions`,
      key: own,
      model: process.env.AI_MODEL ?? "gemini-flash-latest",
    };
  }
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "google/gemini-2.5-flash",
    };
  }
  return null;
}
