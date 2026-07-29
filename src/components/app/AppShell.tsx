import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Car, Fuel, History, Home, User } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/dashboard", label: "Painel", icon: BarChart3 },
  { to: "/veiculo", label: "Veículo", icon: Car },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

/**
 * Layout único de todas as telas autenticadas: largura, respiros, navegação
 * inferior e botão flutuante de abastecimento.
 */
export function AppShell({ children, fab = true }: { children: ReactNode; fab?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <main className="flex-1 px-5 pb-32 pt-6">{children}</main>

      {fab ? (
        <Link
          to="/abastecer"
          aria-label="Registrar abastecimento"
          className="fixed bottom-24 left-1/2 z-50 flex h-14 min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-10px_var(--primary)] transition-transform active:scale-95"
        >
          <Fuel className="h-5 w-5" strokeWidth={2.4} />
          Abastecer
        </Link>
      ) : null}

      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="flex items-stretch justify-between">
          {tabs.map((tab) => {
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
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
