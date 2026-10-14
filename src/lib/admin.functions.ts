import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBetaMetrics, type BetaMetrics } from "@/services/beta-metrics";

const PAGE = 1000;
const WEEKS = 6;

/** Busca todas as linhas em páginas de 1000 (limite padrão da API do banco). */
async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  max = 50_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/**
 * Métricas agregadas do beta, só para contas com o papel "admin" em user_roles.
 * A checagem usa a sessão da própria pessoa; a leitura usa o client de serviço.
 */
export const getBetaMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BetaMetrics> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Acesso restrito");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - WEEKS * 7 * 86_400_000).toISOString();

    const users: { id: string; created_at: string }[] = [];
    for (let page = 1; page <= 50; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PAGE });
      if (error) throw new Error(error.message);
      users.push(...data.users.map((u) => ({ id: u.id, created_at: u.created_at })));
      if (data.users.length < PAGE) break;
    }

    const [vehicles, fuelings, events, feedback] = await Promise.all([
      fetchAll((from, to) =>
        supabaseAdmin.from("vehicles").select("user_id, brand, model").range(from, to),
      ),
      fetchAll((from, to) =>
        supabaseAdmin.from("fuelings").select("user_id, created_at").range(from, to),
      ),
      fetchAll((from, to) =>
        supabaseAdmin
          .from("events")
          .select("user_id, name, created_at")
          .gte("created_at", since)
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabaseAdmin
          .from("feedback")
          .select("kind, rating, message, page, created_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
    ]);

    return computeBetaMetrics(
      { now: new Date(), users, vehicles, fuelings, events, feedback },
      WEEKS,
    );
  });

/** A conta logada é admin? Usado só para mostrar o atalho do painel no Perfil. */
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: !!data };
  });
