import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentSession } from "@/lib/session";
import { useFunnelTracking } from "@/hooks/use-funnel";

function oauthErrorFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(
    `${window.location.search.slice(1)}&${window.location.hash.replace(/^#/, "")}`,
  );
  const message = params.get("error_description") ?? params.get("error");
  return message ? message.replace(/\+/g, " ").slice(0, 200) : undefined;
}

function AuthenticatedLayout() {
  useFunnelTracking();
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Sessão guardada no aparelho; sem internet, a última sessão válida continua valendo.
    const session = await currentSession();
    if (!session?.user) {
      // Se o login social falhou, o Supabase devolve o motivo no endereço; levamos para a tela de login.
      const oauthError = oauthErrorFromUrl();
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname, ...(oauthError ? { oauth_error: oauthError } : {}) },
      });
    }
    return { user: session.user };
  },
  component: AuthenticatedLayout,
});
