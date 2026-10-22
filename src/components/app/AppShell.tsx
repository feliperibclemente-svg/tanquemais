import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FlaskConical, Fuel, History, Home, User } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { trackOncePerSession } from "@/lib/analytics";

/**
 * Início à esquerda (padrão de mercado) e a ação principal, Abastecer, no centro.
 * Veículo fica no topo do Início e no Perfil.
 */
const tabs = [
  { to: "/app", label: "Início", icon: Home, primary: false },
  { to: "/historico", label: "Histórico", icon: History, primary: false },
  { to: "/abastecer", label: "Abastecer", icon: Fuel, primary: true },
  { to: "/dashboard", label: "Painel", icon: BarChart3, primary: false },
  { to: "/perfil", label: "Perfil", icon: User, primary: false },
] as const;

const SCREENS: Record<string, string> = {
  "/app": "inicio",
  "/dashboard": "painel",
  "/historico": "historico",
};

/**
 * Layout único de todas as telas autenticadas: largura, respiros e navegação inferior.
 * `fab` ficou sem efeito: o Abastecer agora é o item central da barra.
 */
export function AppShell({ children }: { children: ReactNode; fab?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Mensuração: quem consulta os números (uma vez por tela por sessão).
  useEffect(() => {
    const screen = SCREENS[pathname];
    if (screen) trackOncePerSession("screen_viewed", screen, { screen });
  }, [pathname]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <main className="flex-1 px-5 pb-28 pt-6">
        <Link
          to="/beta"
          className="mb-4 inline-flex min-h-8 items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Versão Beta
        </Link>
        {children}
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-1/2 z-40 [view-transition-name:bottom-nav] w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="flex items-stretch justify-between">
          {tabs.map((tab) => {
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
            if (tab.primary) {
              return (
                <li key={tab.to} className="flex flex-1 justify-center">
                  <Link
                    to={tab.to}
                    aria-current={active ? "page" : undefined}
                    className="flex min-h-11 flex-col items-center gap-1 px-1 pb-2.5 text-[11px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background transition-transform active:scale-95">
                      <Fuel className="h-6 w-6" strokeWidth={2.4} />
                    </span>
                    {tab.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.to} className="flex-1">
                <Link
                  to={tab.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-accent" : "bg-transparent"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
