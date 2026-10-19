import { createServerFn } from "@tanstack/react-start";
import { isReactRecoverable, isStaleBuildError } from "@/lib/telemetry";
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

/** Situação dos preços de referência da ANP (última semana importada). */
export const anpStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("fuel_price_references")
      .select("week_start, week_end")
      .order("week_start", { ascending: false })
      .limit(1);
    const latest = data?.[0] ?? null;
    let rows = 0;
    if (latest) {
      const { count } = await supabaseAdmin
        .from("fuel_price_references")
        .select("id", { count: "exact", head: true })
        .eq("week_start", latest.week_start);
      rows = count ?? 0;
    }
    return { latest, rows };
  });

/** Importa agora a semana mais recente da ANP (botão no painel admin). */
export const runAnpImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito");
    const { importAnpWeek } = await import("@/lib/anp-import.server");
    // Pelo botão do admin, reimporta a semana mesmo que já exista (corrige nomes e falhas).
    return importAnpWeek({ force: true });
  });

/** Erros do app nos últimos 7 dias, agrupados pela mensagem (painel admin). */
export const recentErrors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("app_errors")
      .select("message, route, user_id, user_agent, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const groups = new Map<
      string,
      { message: string; count: number; users: Set<string>; routes: Set<string>; lastSeen: string }
    >();
    for (const e of data ?? []) {
      const g = groups.get(e.message) ?? {
        message: e.message,
        count: 0,
        users: new Set<string>(),
        routes: new Set<string>(),
        lastSeen: e.created_at,
      };
      g.count += 1;
      if (e.user_id) g.users.add(e.user_id);
      if (e.route) g.routes.add(e.route);
      groups.set(e.message, g);
    }
    return {
      total: data?.length ?? 0,
      groups: [...groups.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((g) => ({
          message: g.message,
          // Tipos inofensivos, explicados no painel (valem também para registros antigos).
          kind: isStaleBuildError(g.message)
            ? ("versao-antiga" as const)
            : isReactRecoverable(g.message)
              ? ("recuperado" as const)
              : ("erro" as const),
          count: g.count,
          users: g.users.size,
          routes: [...g.routes].slice(0, 3),
          lastSeen: g.lastSeen,
        })),
    };
  });
