import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const factsSchema = z.object({
  facts: z.array(z.string().max(240)).max(8),
  vehicle: z.string().max(80).optional(),
});

/**
 * A IA apenas redige. Todos os números vêm calculados do cliente/servidor —
 * o modelo é instruído a nunca criar valores novos.
 */
export const phraseInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => factsSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || data.facts.length === 0) return { text: null as string | null };

    const prompt = [
      "Você é a TanqueIA, assistente de economia de combustível de um app brasileiro.",
      "Escreva UM parágrafo curto (máximo 2 frases, até 220 caracteres) em português do Brasil.",
      "REGRA ABSOLUTA: use apenas os números listados abaixo. Nunca invente, arredonde de forma diferente nem crie novos valores.",
      "Tom: direto, prático e encorajador. Sem emojis. Sem saudação.",
      data.vehicle ? `Veículo: ${data.vehicle}` : "",
      "Dados:",
      ...data.facts.map((f) => `- ${f}`),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) return { text: null as string | null };
      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim() ?? null;
      /**
       * Guarda-corpo: se o modelo escrever qualquer número que não esteja nos
       * fatos calculados, descartamos a frase e o app usa o texto determinístico.
       */
      if (text && !numbersAreGrounded(text, data.facts)) return { text: null as string | null };
      return { text };
    } catch {
      return { text: null as string | null };
    }
  });
