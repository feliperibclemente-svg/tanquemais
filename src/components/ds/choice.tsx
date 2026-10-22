import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChoiceOption {
  value: string;
  label: string;
}

/**
 * Seletor por chips — usado para combustível, veículo e privacidade.
 * Acessível via role="radiogroup"/aria-checked.
 */
export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  fill = false,
  className,
}: {
  label: string;
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /** Distribui os chips igualmente na linha. */
  fill?: boolean;
  className?: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  // Na linha rolável, o chip escolhido precisa aparecer (ex.: "Tudo" é o último).
  useEffect(() => {
    const box = row.current;
    const chip = box?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!box || !chip || fill) return;
    const left = chip.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + chip.offsetWidth > box.scrollLeft + box.clientWidth)
      box.scrollLeft = left - 20;
  }, [value, fill]);
  return (
    <div
      ref={row}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex gap-2",
        // Uma linha que rola para o lado, encostando nas bordas da tela.
        fill ? "" : "no-scrollbar -mx-5 overflow-x-auto px-5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 shrink-0 rounded-2xl border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              fill && "flex-1 px-2",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
