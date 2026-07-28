import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

/** Converte "12,34" ou "1.234,56" em número. */
export function parseDecimal(value: string): number {
  const clean = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Mantém apenas dígitos, vírgula e ponto durante a digitação. */
export function maskDecimal(value: string, decimals = 2): string {
  const cleaned = value.replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  if (rest.length === 0) return intPart;
  return `${intPart},${rest.join("").slice(0, decimals)}`;
}

export function maskInteger(value: string): string {
  return value.replace(/\D/g, "").slice(0, 7);
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  error?: string;
  autoFocus?: boolean;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
}

/** Campo numérico grande, otimizado para preenchimento rápido no celular. */
export const NumericField = forwardRef<HTMLInputElement, FieldProps>(function NumericField(
  { label, value, onChange, prefix, suffix, hint, error, autoFocus, inputMode = "decimal", placeholder },
  ref,
) {
  const id = useId();

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-14 items-center gap-2 rounded-2xl border bg-card px-4 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25",
          error ? "border-destructive" : "border-border",
        )}
      >
        {prefix ? <span className="text-lg font-medium text-muted-foreground">{prefix}</span> : null}
        <input
          id={id}
          ref={ref}
          value={value}
          autoFocus={autoFocus}
          inputMode={inputMode}
          placeholder={placeholder ?? "0"}
          aria-invalid={!!error}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          onChange={(e) =>
            onChange(inputMode === "numeric" ? maskInteger(e.target.value) : maskDecimal(e.target.value))
          }
          className="min-h-11 w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
        />
        {suffix ? <span className="text-sm font-medium text-muted-foreground">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-hint`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
