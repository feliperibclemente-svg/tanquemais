import { useState } from "react";
import { BellRing, X } from "lucide-react";
import { ActionLink } from "@/components/ds/action";
import { AppCard } from "@/components/app/Surface";

const KEY = "tanque:reminder-dismissed";

function dismissedFor(lastId: string) {
  try {
    return localStorage.getItem(KEY) === lastId;
  } catch {
    return false;
  }
}

/**
 * Lembrete discreto na Home quando passa do intervalo habitual entre abastecimentos.
 * Não usa notificação nem localização; some ao fechar até o próximo registro.
 */
export function ReminderCard({
  lastId,
  daysSince,
  typicalDays,
}: {
  lastId: string;
  daysSince: number;
  typicalDays: number;
}) {
  const [hidden, setHidden] = useState(() => dismissedFor(lastId));
  if (hidden) return null;

  return (
    <AppCard className="relative p-4">
      <button
        type="button"
        aria-label="Fechar lembrete"
        onClick={() => {
          try {
            localStorage.setItem(KEY, lastId);
          } catch {
            /* sem armazenamento: só esconde nesta visita */
          }
          setHidden(true);
        }}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-foreground">Abasteceu nos últimos dias?</p>
          <p className="mt-1 text-muted-foreground">
            Faz {daysSince} dias do último registro e você costuma abastecer a cada{" "}
            {typicalDays === 1 ? "1 dia" : `${typicalDays} dias`}. Se abasteceu, registre quando
            estiver parado.
          </p>
        </div>
      </div>
      <ActionLink to="/abastecer" variant="secondary" size="md" className="mt-3">
        Registrar agora
      </ActionLink>
    </AppCard>
  );
}
