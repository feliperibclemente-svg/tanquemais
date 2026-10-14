import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import {
  Action,
  AppCard,
  AppShell,
  EmptyState,
  ErrorState,
  PageHeader,
  ScreenSkeleton,
  StatTile,
} from "@/components/ds";
import { getBetaMetrics } from "@/lib/admin.functions";
import { fullDate, num } from "@/lib/format";
import type { BetaMetrics } from "@/services/beta-metrics";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Painel do beta — Tanque+" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

/** Metas da onda 1 do beta (ver plano de lançamento). */
const GOALS = { activation48h: 0.6, threeIn21Days: 0.4, rating: 4 };

const pct = (value: number | null) => (value == null ? "—" : `${num(value * 100, 0)}%`);

const KIND_LABEL: Record<string, string> = {
  problema: "Problema",
  sugestao: "Sugestão",
  elogio: "Elogio",
};

function AdminPage() {
  const fetchMetrics = useServerFn(getBetaMetrics);
  const metrics = useQuery({
    queryKey: ["beta-metrics"],
    queryFn: () => fetchMetrics(),
    staleTime: 60_000,
    retry: false,
  });

  if (metrics.isLoading) {
    return (
      <AppShell fab={false}>
        <PageHeader title="Painel do beta" />
        <ScreenSkeleton cards={3} />
      </AppShell>
    );
  }

  if (metrics.isError) {
    const restricted = /acesso restrito/i.test(metrics.error.message);
    return (
      <AppShell fab={false}>
        <PageHeader title="Painel do beta" />
        {restricted ? (
          <EmptyState
            emoji="🔒"
            title="Acesso restrito"
            description="Este painel é só para a equipe do Tanque+."
          />
        ) : (
          <ErrorState
            title="Não conseguimos carregar as métricas"
            onRetry={() => void metrics.refetch()}
          />
        )}
      </AppShell>
    );
  }

  const m = metrics.data as BetaMetrics;

  return (
    <AppShell fab={false}>
      <PageHeader
        title="Painel do beta"
        subtitle={`Atualizado ${fullDate(m.generatedAt)}`}
        action={
          <Action
            size="icon"
            variant="secondary"
            aria-label="Atualizar"
            loading={metrics.isFetching}
            onClick={() => void metrics.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Action>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Cadastros"
          value={String(m.funnel.signups)}
          hint={`+${m.signupsLast7Days} nos últimos 7 dias`}
        />
        <StatTile
          label="1º abastecimento em 48 h"
          value={pct(m.activation48h.rate)}
          tone={toneFor(m.activation48h.rate, GOALS.activation48h)}
          hint={`meta ${pct(GOALS.activation48h)} · ${m.activation48h.activated}/${m.activation48h.eligible}`}
        />
        <StatTile
          label="3 abastecimentos em 21 dias"
          value={pct(m.threeIn21Days.rate)}
          tone={toneFor(m.threeIn21Days.rate, GOALS.threeIn21Days)}
          hint={`meta ${pct(GOALS.threeIn21Days)} · ${m.threeIn21Days.reached}/${m.threeIn21Days.eligible}`}
        />
        <StatTile
          label="Nota média"
          value={m.feedback.averageRating ? num(m.feedback.averageRating, 1) : "—"}
          tone={
            m.feedback.averageRating == null
              ? "default"
              : m.feedback.averageRating >= GOALS.rating
                ? "good"
                : "warning"
          }
          hint={`meta ${GOALS.rating} · ${m.feedback.total} feedbacks`}
        />
      </div>

      <section className="mt-5 space-y-4">
        <AppCard>
          <p className="text-sm font-semibold text-foreground">Funil</p>
          <div className="mt-3 space-y-3">
            <FunnelRow label="Cadastrados" value={m.funnel.signups} total={m.funnel.signups} />
            <FunnelRow label="Com veículo" value={m.funnel.withVehicle} total={m.funnel.signups} />
            <FunnelRow
              label="1º abastecimento"
              value={m.funnel.withFirstFueling}
              total={m.funnel.signups}
            />
            <FunnelRow
              label="3 ou mais abastecimentos"
              value={m.funnel.withThreeFuelings}
              total={m.funnel.signups}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {m.installs} {m.installs === 1 ? "pessoa instalou" : "pessoas instalaram"} o app na tela
            inicial.
          </p>
        </AppCard>

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Por semana</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Usuários ativos e abastecimentos registrados (semana começando na segunda).
          </p>
          <WeekChart weeks={m.weeks} />
        </AppCard>

        {m.topVehicles.length > 0 ? (
          <AppCard>
            <p className="text-sm font-semibold text-foreground">Veículos mais cadastrados</p>
            <dl className="mt-3 space-y-2 text-sm">
              {m.topVehicles.map((v) => (
                <div key={v.name} className="flex items-center justify-between gap-3">
                  <dt className="truncate text-muted-foreground">{v.name}</dt>
                  <dd className="font-medium text-foreground">{v.count}</dd>
                </div>
              ))}
            </dl>
          </AppCard>
        ) : null}

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Últimos feedbacks</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {Object.entries(m.feedback.byKind)
              .map(([kind, count]) => `${KIND_LABEL[kind] ?? kind}: ${count}`)
              .join(" · ") || "Nenhum feedback ainda."}
          </p>
          <ul className="mt-3 space-y-3">
            {m.feedback.latest.map((f, index) => (
              <li key={`${f.created_at}-${index}`} className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {fullDate(f.created_at)} · {KIND_LABEL[f.kind] ?? f.kind}
                  {f.rating ? ` · nota ${f.rating}` : ""}
                  {f.page ? ` · ${f.page}` : ""}
                </p>
                <p className="mt-1 text-sm text-foreground">{f.message}</p>
              </li>
            ))}
          </ul>
        </AppCard>
      </section>
    </AppShell>
  );
}

function toneFor(rate: number | null, goal: number): "default" | "good" | "warning" {
  if (rate == null) return "default";
  return rate >= goal ? "good" : "warning";
}

function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const share = total > 0 ? value / total : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">
          {value} <span className="text-xs font-normal text-muted-foreground">{pct(share)}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

const weekLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function WeekChart({ weeks }: { weeks: BetaMetrics["weeks"] }) {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.activeUsers, w.fuelings)));
  return (
    <div className="mt-4">
      <div className="flex h-32 items-end gap-2">
        {weeks.map((w) => (
          <div key={w.week} className="flex h-full flex-1 items-end justify-center gap-1">
            <Bar value={w.activeUsers} max={max} className="bg-primary" />
            <Bar value={w.fuelings} max={max} className="bg-foreground/30" />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {weeks.map((w) => (
          <span key={w.week} className="flex-1 text-center text-[10px] text-muted-foreground">
            {weekLabel.format(new Date(`${w.week}T12:00:00`))}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Ativos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-foreground/30" /> Abastecimentos
        </span>
      </div>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="flex h-full w-3 flex-col items-center justify-end">
      <span className="mb-0.5 text-[10px] text-muted-foreground">{value || ""}</span>
      <div
        className={`w-full rounded-t ${className}`}
        style={{ height: `${(value / max) * 100}%`, minHeight: value ? 4 : 0 }}
        title={String(value)}
      />
    </div>
  );
}
