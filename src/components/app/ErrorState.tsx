import { AlertTriangle } from "lucide-react";
import { Action } from "@/components/ds/action";
import { AppCard } from "@/components/app/Surface";

/** Estado de erro padrão: explica em português simples e oferece nova tentativa. */
export function ErrorState({
  title = "Não conseguimos carregar seus dados",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <AppCard className="text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Action variant="secondary" size="md" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Action>
      ) : null}
    </AppCard>
  );
}
