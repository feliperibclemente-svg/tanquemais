import { CircleAlert, CircleCheck, CircleHelp } from "lucide-react";
import { brl } from "@/lib/format";
import type { PriceVerdict } from "@/services/verdict";
import { AppCard } from "@/components/app/Surface";

const TONE = {
  good: {
    icon: CircleCheck,
    dot: "🟢",
    text: "text-primary",
    surface: "border-primary/30 bg-accent/50",
  },
  bad: {
    icon: CircleAlert,
    dot: "🔴",
    text: "text-destructive",
    surface: "border-destructive/30 bg-destructive/5",
  },
  neutral: {
    icon: CircleHelp,
    dot: "⚪",
    text: "text-muted-foreground",
    surface: "border-border bg-muted/40",
  },
} as const;

/** Linha compacta: usada na Home e no histórico. */
export function VerdictPill({ verdict }: { verdict: PriceVerdict }) {
  const tone = TONE[verdict.tone];
  const Icon = tone.icon;
  return (
    <p className={`flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
      <span className="truncate">
        {verdict.tone === "good" && verdict.amount
          ? `Economia estimada: ${brl(verdict.amount)}`
          : verdict.tone === "bad" && verdict.amount
            ? `Acima da média: ${brl(verdict.amount)} a mais`
            : verdict.headline}
      </span>
    </p>
  );
}

/** Cartão completo: usado logo depois de registrar o abastecimento. */
export function VerdictCard({ verdict }: { verdict: PriceVerdict }) {
  const tone = TONE[verdict.tone];
  const Icon = tone.icon;

  return (
    <AppCard className={tone.surface}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 shrink-0 ${tone.text}`} strokeWidth={2.4} />
        <p className={`text-base font-semibold ${tone.text}`}>{verdict.headline}</p>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-foreground">{verdict.detail}</p>

      {verdict.amount && verdict.tone !== "neutral" ? (
        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {verdict.tone === "good" ? "Você economizou " : "Você gastou a mais "}
          <span className={tone.text}>{brl(verdict.amount)}</span>
        </p>
      ) : null}

      {verdict.reference ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Comparado com {verdict.reference}
          {verdict.referencePrice ? ` (${brl(verdict.referencePrice)}/L)` : ""}.
        </p>
      ) : null}
    </AppCard>
  );
}
