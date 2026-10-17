import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Tarefa agendada (Vercel Cron, vercel.json): importa a semana nova da ANP.
 * Só responde com o segredo CRON_SECRET, que a Vercel envia no cabeçalho Authorization.
 */
export const Route = createFileRoute("/api/cron/anp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) return Response.json({ error: "CRON_SECRET ausente" }, { status: 503 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) {
          return Response.json({ error: "não autorizado" }, { status: 401 });
        }
        const { importAnpWeek } = await import("@/lib/anp-import.server");
        const result = await importAnpWeek();
        return Response.json(result, { status: result.status === "error" ? 500 : 200 });
      },
    },
  },
});
