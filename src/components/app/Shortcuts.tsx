import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPinned, MessagesSquare, Route, Wrench } from "lucide-react";
import { recapSeen, useMonthlyRecap } from "@/hooks/use-recap";

/**
 * Atalhos do Início, como a fileira de ícones do iFood e do Uber: tudo o que o app faz,
 * a um toque, sem precisar descobrir no Painel. Bolinha = novidade.
 */
export function Shortcuts() {
  const { recap } = useMonthlyRecap();
  const recapNew = !!recap && recap.slides.length >= 3 && !recapSeen(recap.key);
  const items = [
    { to: "/checkup", label: "Check-up", icon: Wrench, dot: false },
    { to: "/precos", label: "Preços", icon: MapPinned, dot: false },
    { to: "/viagem", label: "Viagem", icon: Route, dot: false },
    { to: "/comunidade", label: "Comunidade", icon: MessagesSquare, dot: false },
    { to: "/retrospectiva", label: "Meu mês", icon: CalendarDays, dot: recapNew },
  ] as const;
  return (
    <nav aria-label="Atalhos" className="grid grid-cols-5 gap-1">
      {items.map(({ to, label, icon: Icon, dot }) => (
        <Link
          key={to}
          to={to}
          className="flex min-h-11 flex-col items-center gap-1.5 rounded-2xl py-1 text-center"
        >
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <Icon className="h-6 w-6" strokeWidth={2.2} />
            {dot ? (
              <span
                aria-label="novidade"
                className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
              />
            ) : null}
          </span>
          <span className="text-[11px] font-medium leading-tight text-foreground">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
