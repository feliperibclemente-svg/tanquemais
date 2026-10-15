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
export const phraseInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const none = { text: null as string | null, basis: null as string | null };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return none;

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
      "Você é a TanqueIA, assistente de custos de combustível de um app brasileiro.",
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
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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
