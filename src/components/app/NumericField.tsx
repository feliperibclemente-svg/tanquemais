import { forwardRef, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Converte "12,34" ou "1.234,56" em número. */
export function parseDecimal(value: string): number {
  const clean = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
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

/**
 * Máscara de dinheiro estilo "maquininha": os dígitos entram pela direita, então digitar
 * 5 0 0 0 vira "50,00" e 1 2 3 4 5 6 vira "1.234,56". Com 3 casas (preço da bomba),
 * 5 8 9 9 vira "5,899". Vírgula e ponto ficam sempre no lugar certo.
 */
export function maskCents(value: string, decimals: 2 | 3 = 2): string {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
  if (!digits) return "";
  const padded = digits.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, -decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intPart},${padded.slice(-decimals)}`;
}

/**
 * Próximo valor de um campo de dinheiro. Por padrão os dígitos entram pela direita
 * ("maquininha"). Se a pessoa digitar vírgula ou ponto, o campo passa a aceitar a
 * digitação livre ("5,89"), para não transformar 5,89 em 0,589.
 */
export function nextCentsValue(
  previous: string,
  raw: string,
  decimals: 2 | 3,
  natural: boolean,
): { value: string; natural: boolean } {
  if (natural) {
    const value = maskDecimal(raw, decimals);
    return { value, natural: value !== "" };
  }
  if (/[.,]$/.test(raw) && raw.length > previous.length) {
    // Os dígitos já digitados eram reais inteiros: "5" + "," → "5,".
    const digits = previous.replace(/\D/g, "").replace(/^0+/, "");
    return { value: `${digits || "0"},`, natural: true };
  }
  return { value: maskCents(raw, decimals), natural: false };
}

/** Formata um número já conhecido no mesmo padrão da máscara ("50" → "50,00"). */
export function formatCents(amount: number, decimals: 2 | 3 = 2): string {
  if (!(amount > 0)) return "";
  return maskCents(amount.toFixed(decimals), decimals);
}

/** Inteiro com separador de milhar enquanto digita (quilometragem: "45.230"). */
export function maskInteger(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 7)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
  /** Máscara de dinheiro com 2 (valor) ou 3 (preço por litro) casas. Usa teclado numérico. */
  cents?: 2 | 3;
  placeholder?: string;
}

/** Campo numérico grande, otimizado para preenchimento rápido no celular. */
export const NumericField = forwardRef<HTMLInputElement, FieldProps>(function NumericField(
  {
    label,
    value,
    onChange,
    prefix,
    suffix,
    hint,
    error,
    autoFocus,
    inputMode = "decimal",
    cents,
    placeholder,
  },
  ref,
) {
  const id = useId();
  const [natural, setNatural] = useState(false);
  useEffect(() => {
    if (!value) setNatural(false);
  }, [value]);

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
        {prefix ? (
          <span className="text-lg font-medium text-muted-foreground">{prefix}</span>
        ) : null}
        <input
          id={id}
          ref={ref}
          value={value}
          autoFocus={autoFocus}
          inputMode={cents ? "decimal" : inputMode}
          placeholder={placeholder ?? (cents ? `0,${"0".repeat(cents)}` : "0")}
          aria-invalid={!!error}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          onChange={(e) => {
            if (cents) {
              const next = nextCentsValue(value, e.target.value, cents, natural);
              setNatural(next.natural);
              onChange(next.value);
              return;
            }
            onChange(
              inputMode === "numeric" ? maskInteger(e.target.value) : maskDecimal(e.target.value),
            );
          }}
          className="min-h-11 w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
        />
        {suffix ? (
          <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
        ) : null}
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
