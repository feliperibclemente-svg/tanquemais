import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25 aria-[invalid=true]:border-destructive";

function Wrapper({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-hint`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: { label: string; hint?: string; error?: string } & ComponentProps<"input">) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        className={cn(control, className)}
      />
    </Wrapper>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: { label: string; hint?: string; error?: string } & ComponentProps<"textarea">) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <textarea
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        className={cn(control, "min-h-32 resize-y py-3 leading-relaxed", className)}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  options,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
} & ComponentProps<"select">) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        className={cn(control, className)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

/** Linha de ligar/desligar com área de toque completa. */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-[var(--primary)]"
      />
    </label>
  );
}
