import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiProvider } from "@/lib/ai.server";
import { COMMUNITY_MAX, COMMUNITY_MIN, hasLink } from "@/content/community";
import {
  moderationMessage,
  moderationPrompt,
  parseModeration,
} from "@/services/community-moderation";

/**
 * Moderação da comunidade, só para contas com o papel "admin".
 * A checagem usa a sessão da própria pessoa; leitura e escrita usam o client de serviço.
 * O admin vê o texto e as denúncias, mas não quem publicou nem quem denunciou.
 */
async function assertAdmin(context: {
  supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => unknown };
  userId: string;
}) {
  const { data, error } = (await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  })) as { data: boolean | null; error: unknown };
  if (error || !data) throw new Error("Acesso restrito");
}

export interface ModerationItem {
  id: string;
  topic: string;
  content: string;
  status: "pendente" | "em_revisao";
  created_at: string;
  reports: Record<string, number>;
}

export const listModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: ModerationItem[]; approved: number }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: posts, error }, { count }] = await Promise.all([
      supabaseAdmin
        .from("community_posts")
        .select("id, topic, content, status, created_at")
        .in("status", ["pendente", "em_revisao"])
        .order("created_at", { ascending: true })
        .limit(100),
      supabaseAdmin
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "aprovada"),
    ]);
    if (error) throw new Error(error.message);
    const ids = (posts ?? []).map((p) => p.id);
    const { data: reports } = ids.length
      ? await supabaseAdmin.from("community_reports").select("post_id, reason").in("post_id", ids)
      : { data: [] as { post_id: string; reason: string }[] };
    const byPost = new Map<string, Record<string, number>>();
    for (const r of reports ?? []) {
      const m = byPost.get(r.post_id) ?? {};
      m[r.reason] = (m[r.reason] ?? 0) + 1;
      byPost.set(r.post_id, m);
    }
    return {
      approved: count ?? 0,
      items: (posts ?? []).map((p) => ({
        ...(p as Omit<ModerationItem, "reports">),
        reports: byPost.get(p.id) ?? {},
      })),
    };
  });

export const moderatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; action: "aprovar" | "excluir" }) => {
    if (typeof input?.id !== "string" || !["aprovar", "excluir"].includes(input?.action)) {
      throw new Error("Pedido inválido");
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "excluir") {
      const { error } = await supabaseAdmin.from("community_posts").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabaseAdmin
      .from("community_posts")
      .update({ status: "aprovada", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    // Aprovada de novo depois de revisão: as denúncias antigas já foram consideradas.
    await supabaseAdmin.from("community_reports").delete().eq("post_id", data.id);
    return { ok: true };
  });

/**
 * Publica uma dica passando pelas barreiras automáticas:
 * 1. regras do banco (tamanho, links, palavras proibidas, limite diário) — dentro de
 *    community_publish, que vale mesmo se alguém chamar o banco direto;
 * 2. revisão por IA aqui no servidor (se a IA falhar, a dica segue para a revisão humana);
 * 3. aprovação do admin antes de aparecer no mural.
 * Dicas recusadas não são guardadas.
 */
export const publishTip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topic: string; content: string }) => {
    if (typeof input?.topic !== "string" || typeof input?.content !== "string") {
      throw new Error("Pedido inválido");
    }
    return { topic: input.topic, content: input.content.slice(0, 600) };
  })
  .handler(async ({ context, data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const text = data.content.replace(/\s+/g, " ").trim();
    if (text.length < COMMUNITY_MIN || text.length > COMMUNITY_MAX) {
      return { ok: false, message: "A dica precisa ter entre 10 e 500 caracteres." };
    }
    if (hasLink(text)) return { ok: false, message: "Links não são aceitos na comunidade." };

    const ai = aiProvider();
    if (ai) {
      try {
        const res = await fetch(ai.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ai.model,
            temperature: 0,
            messages: [{ role: "user", content: moderationPrompt(text) }],
          }),
          signal: AbortSignal.timeout(12_000),
        });
        if (res.ok) {
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const verdict = parseModeration(json.choices?.[0]?.message?.content ?? "");
          if (verdict && !verdict.ok) {
            return { ok: false, message: moderationMessage(verdict.category) };
          }
        }
      } catch {
        /* IA indisponível: segue para a revisão humana */
      }
    }

    const { error } = await context.supabase.rpc("community_publish", {
      _topic: data.topic,
      _content: text,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });
