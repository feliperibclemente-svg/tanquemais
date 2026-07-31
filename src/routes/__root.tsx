import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { installTelemetry, setTelemetryUser } from "@/lib/telemetry";
import { trackPageView } from "@/lib/analytics";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <span aria-hidden="true" className="text-5xl">
          🛣️
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você abriu não existe ou foi movido.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <span aria-hidden="true" className="text-5xl">
          ⚠️
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Algo saiu do trilho
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não conseguimos carregar esta tela. Tente novamente em instantes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-medium text-foreground"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Tanque+ — Economize combustível" },
      {
        name: "description",
        content:
          "Assistente inteligente de abastecimento: consumo, custo por km e postos mais baratos.",
      },
      { name: "theme-color", content: "#22C55E" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      {
        children:
          "try{if(localStorage.getItem('tanque:theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function OfflineBanner({ pendingCount }: { pendingCount: number }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline && pendingCount === 0) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] bg-foreground px-4 py-2 text-center text-xs font-medium text-background"
    >
      {offline
        ? "Você está offline — mostrando os últimos dados salvos."
        : `Sincronizando ${pendingCount} ${pendingCount === 1 ? "registro" : "registros"}…`}
    </div>
  );
}

/** Fila offline + banner de sincronização. */
function OfflineSync() {
  const { pendingCount } = useOfflineSync();
  return <OfflineBanner pendingCount={pendingCount} />;
}

/** Telemetria: handlers globais, web vitals e page views. */
function Telemetry() {
  const router = useRouter();

  useEffect(() => {
    installTelemetry();
    trackPageView(window.location.pathname);
    return router.subscribe("onResolved", ({ toLocation }) =>
      trackPageView(toLocation.pathname),
    );
  }, [router]);

  return null;
}

function AuthSync() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setTelemetryUser(session?.user?.id ?? null);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Telemetry />
        <AuthSync />
        <OfflineSync />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
