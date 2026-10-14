import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estrela de favorito do veículo principal. Cheia = principal; vazia = toque para
 * favoritar. O principal é o veículo que já vem escolhido ao abastecer.
 */
export function PrimaryStar({
  active,
  onClick,
  disabled,
  withLabel = false,
}: {
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  withLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={active ? undefined : onClick}
      disabled={disabled || active}
      aria-pressed={active}
      aria-label={active ? "Veículo principal" : "Favoritar como veículo principal"}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        withLabel && "px-2",
        active ? "text-primary" : "text-muted-foreground hover:text-primary",
        disabled && !active && "opacity-60",
      )}
    >
      <Star className="h-5 w-5" fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
      {withLabel ? <span>{active ? "Principal" : "Favoritar como principal"}</span> : null}
    </button>
  );
}
