import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeFuelings, overview, savingsOpportunity } from "@/services/analytics";
import { buildInsights } from "@/services/insights";
import { checkPhrase } from "@/services/tanque-ia-guard";
import type { Fueling } from "@/types/domain";

/**
 * TanqueIA: a IA só reescreve, em uma frase, fatos que o próprio servidor calculou a partir
 * dos registros do usuário (lidos com a sessão dele, sob RLS). Nada vem como texto do
 * navegador — isso impede usar o endpoint como proxy de IA e evita fatos adulterados.
 *
 * Se a frase da IA citar um número que não está nos fatos, falar em economia/previsão
 * sem base, ou falhar por qualquer motivo, o app mostra o texto calculado.
 */
/**
 * Provedor de IA (API no formato OpenAI de chat/completions):
 * - Fora do Lovable: AI_API_KEY (padrão: Google Gemini; AI_BASE_URL e AI_MODEL trocam o provedor).
 * - No Lovable: LOVABLE_API_KEY, pelo gateway deles.
 * Sem chave, o app mostra o texto calculado.
 */
function aiProvider() {
  const own = process.env.AI_API_KEY;
  if (own) {
    const base = (
      process.env.AI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai"
    ).replace(/\/+$/, "");
    return {
      url: `${base}/chat/completions`,
      key: own,
      model: process.env.AI_MODEL ?? "gemini-2.5-flash",
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

export const phraseInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const none = { text: null as string | null, basis: null as string | null };
    const ai = aiProvider();
    if (!ai) return none;

    const [{ data: vehicles }, { data: fuelings }] = await Promise.all([
      context.supabase
        .from("vehicles")
        .select("id, brand, model, nickname, is_primary, created_at")
        .eq("user_id", context.userId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true }),
      context.supabase
        .from("fuelings")
        .select("*")
        .eq("user_id", context.userId)
        .order("filled_at", { ascending: false })
        .limit(200),
    ]);
    const vehicle = vehicles?.[0];
    if (!vehicle) return none;

    const rows = computeFuelings(
      ((fuelings ?? []) as Fueling[]).filter((f) => f.vehicle_id === vehicle.id),
    );
    const insights = buildInsights(overview(rows), savingsOpportunity(rows, [], null, null));
    if (!insights.length || insights[0].id === "empty") return none;

    const facts = insights.slice(0, 3).map((i) => `${i.title}: ${i.body}`);
    const prompt = [
      "Você é o Teo, assistente (TanqueIA) de custos de combustível do app brasileiro Tanque+.",
      "Fale em primeira pessoa, de forma próxima e simples, como um amigo que entende de carro.",
      "Escreva UM parágrafo curto (máximo 2 frases, até 220 caracteres) em português do Brasil.",
      "REGRA ABSOLUTA: use apenas os números listados abaixo, exatamente como estão escritos.",
      "Valores gastos são GASTOS: nunca os chame de economia, desconto ou ganho.",
      "Não faça previsões, promessas ou recomendações de compra. Descreva só o que os dados mostram.",
      "Tom: direto, prático e encorajador. Sem emojis. Sem saudação.",
      `Veículo: ${vehicle.brand} ${vehicle.model}`,
      "Dados:",
      ...facts.map((f) => `- ${f}`),
    ].join("\n");

    try {
      const response = await fetch(ai.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ai.model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) return none;
      const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!checkPhrase(text, facts).ok) return none;
      return { text, basis: insights[0].title };
    } catch {
      return none;
    }
  });
