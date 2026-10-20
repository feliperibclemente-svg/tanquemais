import { createServerFn } from "@tanstack/react-start";
import { brandLabel, vehicleWords } from "@/constants/vehicles";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeFuelings, overview, savingsOpportunity } from "@/services/analytics";
import { buildInsights } from "@/services/insights";
import { chooseReference, normalizeName, toUf } from "@/services/anp";
import { checkPhrase } from "@/services/tanque-ia-guard";
import { aiProvider } from "@/lib/ai.server";
import type { Fueling } from "@/types/domain";

/**
 * TanqueIA: a IA só reescreve, em uma frase, fatos que o próprio servidor calculou a partir
 * dos registros do usuário (lidos com a sessão dele, sob RLS). Nada vem como texto do
 * navegador — isso impede usar o endpoint como proxy de IA e evita fatos adulterados.
 *
 * Se a frase da IA citar um número que não está nos fatos, falar em economia/previsão
 * sem base, ou falhar por qualquer motivo, o app mostra o texto calculado.
 */
/** Frases da IA por pessoa por dia; depois disso o app mostra o texto calculado. */
const AI_DAILY_TIPS = 20;

export const phraseInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const none = { text: null as string | null, basis: null as string | null };
    const ai = aiProvider();
    if (!ai) return none;
    // Limite diário por pessoa (custo). Sem a função no banco, segue sem limite.
    const { data: allowed } = await context.supabase.rpc("ai_take", {
      _kind: "dica",
      _max: AI_DAILY_TIPS,
    });
    if (allowed === false) return none;

    const [{ data: vehicles }, { data: fuelings }, { data: profile }] = await Promise.all([
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
      context.supabase
        .from("profiles")
        .select("city, state")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    const vehicle = vehicles?.[0];
    if (!vehicle) return none;

    const rows = computeFuelings(
      ((fuelings ?? []) as Fueling[]).filter((f) => f.vehicle_id === vehicle.id),
      vehicles ?? [],
    );
    const stats = overview(rows);

    // Média pública da ANP na cidade/estado do perfil, quando houver.
    let cityPrice = null;
    const uf = toUf(profile?.state ?? "");
    if (uf && stats.last) {
      const city = normalizeName(profile?.city);
      const { data: refs } = await context.supabase
        .from("fuel_price_references")
        .select(
          "scope, uf, municipio, municipio_label, fuel_type_id, avg_price, week_start, week_end, stations",
        )
        .eq("uf", uf)
        .in("municipio", city ? ["", city] : [""])
        .eq("fuel_type_id", stats.last.fuel_type_id)
        .order("week_start", { ascending: false })
        .limit(20);
      const reference = chooseReference(
        refs ?? [],
        { uf, city: profile?.city },
        stats.last.fuel_type_id,
        stats.last.filled_at,
      );
      if (reference) cityPrice = { reference, paid: Number(stats.last.price_per_liter) };
    }
    const insights = buildInsights(stats, savingsOpportunity(rows, [], null, null), cityPrice);
    if (!insights.length || insights[0].id === "empty") return none;

    const facts = insights.slice(0, 3).map((i) => `${i.title}: ${i.body}`);
    const prompt = [
      "Você é o Teo, assistente (TanqueIA) de custos de combustível do app brasileiro Tanque+.",
      "Fale em primeira pessoa, de forma próxima e simples, como um amigo que entende de carro e de moto.",
      "Escreva UM parágrafo curto (máximo 2 frases, até 220 caracteres) em português do Brasil.",
      "REGRA ABSOLUTA: use apenas os números listados abaixo, exatamente como estão escritos.",
      "Valores gastos são GASTOS: nunca os chame de economia, desconto ou ganho.",
      "Não faça previsões, promessas ou recomendações de compra. Descreva só o que os dados mostram.",
      "Se citar a média de preços, diga que a fonte é a ANP. Sem opinião sobre governo, Petrobras ou postos.",
      "Tom: direto, prático e encorajador. Sem emojis. Sem saudação.",
      `Veículo: ${brandLabel(vehicle.brand)} ${vehicle.model} (${vehicleWords(vehicle.brand).noun})`,
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
