import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Tarefa diária (Vercel Cron, vercel.json): importa a semana nova da ANP e apaga registros
 * de erro com mais de 90 dias. Só responde com o segredo CRON_SECRET, que a Vercel envia
 * no cabeçalho Authorization.
 */
export const Route = createFileRoute("/api/cron/diario")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) return Response.json({ error: "CRON_SECRET ausente" }, { status: 503 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) {
          return Response.json({ error: "não autorizado" }, { status: 401 });
        }
        const { importAnpWeek, importAnpStations } = await import("@/lib/anp-import.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const anp = await importAnpWeek();
        const stations = await importAnpStations();
        const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
        const cleanup = await supabaseAdmin.from("app_errors").delete().lt("created_at", cutoff);
        return Response.json(
          { anp, stations, errorsCleanup: cleanup.error ? cleanup.error.message : "ok" },
          { status: anp.status === "error" ? 500 : 200 },
        );
      },
    },
  },
});
