import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* --------------------------------- Card ---------------------------------- */

export function AppCard({
  children,
  className,
  ...props
}: { children: ReactNode } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Page heading ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {action ? (
        <Link
          to={action.to}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/* --------------------------------- Stats ---------------------------------- */

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warning";
}) {
  return (
    <AppCard className="flex h-full flex-col justify-between gap-1 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold tracking-tight",
          tone === "good" && "text-primary",
          tone === "warning" && "text-destructive",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </AppCard>
  );
}

/* ------------------------------ Empty states ------------------------------ */

export function EmptyState({
  emoji = "⛽",
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <AppCard className="flex flex-col items-center gap-3 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl"
      >
        {emoji}
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-[260px] text-sm text-muted-foreground">{description}</p>
      {action}
    </AppCard>
  );
}

/* -------------------------------- Skeletons -------------------------------- */

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <AppCard className="space-y-3">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </AppCard>
  );
}

export function ScreenSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-56" />
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} lines={i === 0 ? 2 : 3} />
      ))}
    </div>
  );
}
