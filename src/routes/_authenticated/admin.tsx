import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { anpStatus, getBetaMetrics, recentErrors, runAnpImport } from "@/lib/admin.functions";
import { listModeration, moderatePost } from "@/lib/community.functions";
import { REASON_LABEL, TOPIC_LABEL } from "@/content/community";
import { weekLabel as anpWeekLabel } from "@/services/anp";
import { fullDate, num } from "@/lib/format";
import type { BetaMetrics } from "@/services/beta-metrics";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Painel do beta — Tanque+" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

/** Metas da onda 1 do beta (ver plano de lançamento). */

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
          hint={`${m.activation48h.activated} de ${m.activation48h.eligible} cadastrados há 48 h ou mais`}
        />
        <StatTile
          label="3 abastecimentos em 21 dias"
          value={pct(m.threeIn21Days.rate)}
          hint={`${m.threeIn21Days.reached} de ${m.threeIn21Days.eligible} cadastrados há 21 dias ou mais`}
        />
        <StatTile
          label="Nota média"
          value={m.feedback.averageRating ? num(m.feedback.averageRating, 1) : "—"}
          hint={`${m.feedback.total} ${m.feedback.total === 1 ? "avaliação" : "avaliações"}`}
        />
      </div>

      <section className="mt-5 space-y-4">
        <ModerationCard />

        <ErrorsCard />

        <AnpCard />

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Uso do núcleo nos últimos 7 dias</p>
          <dl className="mt-3 space-y-2 text-sm">
            <MetricRow label="Abriram o Início" value={m.core.screens.inicio ?? 0} />
            <MetricRow label="Abriram o Painel" value={m.core.screens.painel ?? 0} />
            <MetricRow label="Abriram o Histórico" value={m.core.screens.historico ?? 0} />
            <MetricRow label="Telas de registro abertas" value={m.core.formOpened} />
            <MetricRow label="Abastecimentos registrados" value={m.core.fuelingsCreated} />
            <MetricRow label="Falhas no envio offline" value={m.core.syncFailures} />
          </dl>
          {Object.keys(m.core.formErrors).length > 0 ? (
            <>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Por que o registro foi recusado
              </p>
              <dl className="mt-2 space-y-2 text-sm">
                {Object.entries(m.core.formErrors)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, n]) => (
                    <MetricRow key={reason} label={ERROR_LABEL[reason] ?? reason} value={n} />
                  ))}
              </dl>
            </>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Telas: pessoas diferentes, uma vez por sessão. Registro: aberturas e envios contam cada
            vez.
          </p>
        </AppCard>

        {m.sources.length > 0 ? (
          <AppCard>
            <p className="text-sm font-semibold text-foreground">Origem dos cadastros</p>
            <dl className="mt-3 space-y-2 text-sm">
              {m.sources.map((s) => (
                <MetricRow
                  key={s.source}
                  label={s.source}
                  value={`${s.signups} (${s.withFirstFueling} com 1º abastecimento)`}
                />
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Use links como tanquemais.com.br/?ref=instagram para separar os canais.
            </p>
          </AppCard>
        ) : null}

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
              label="2 ou mais abastecimentos"
              value={m.funnel.withSecondFueling}
              total={m.funnel.signups}
            />
            <FunnelRow
              label="3 ou mais abastecimentos"
              value={m.funnel.withThreeFuelings}
              total={m.funnel.signups}
            />
            {m.funnel.withRealConsumption !== null ? (
              <FunnelRow
                label="Viu o consumo real"
                value={m.funnel.withRealConsumption}
                total={m.funnel.signups}
              />
            ) : null}
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

const ERROR_LABEL: Record<string, string> = {
  campos_faltando: "Faltou valor, preço ou km",
  km_menor_que_anterior: "Km menor que o anterior",
  km_maior_que_seguinte: "Km maior que o registro seguinte",
  salto_de_km_nao_confirmado: "Km muito alto, não confirmado",
  data_futura: "Data no futuro",
  dados_invalidos: "Dados inválidos",
  falha_ao_salvar: "Falha ao salvar",
};

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
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

/** Preços de referência da ANP: última semana importada e importação manual. */
function AnpCard() {
  const fetchStatus = useServerFn(anpStatus);
  const runImport = useServerFn(runAnpImport);
  const status = useQuery({ queryKey: ["anp-status"], queryFn: () => fetchStatus(), retry: false });
  const importer = useMutation({
    mutationFn: () => runImport(),
    onSettled: () => void status.refetch(),
  });
  const latest = status.data?.latest;
  const result = importer.data;
  return (
    <AppCard>
      <p className="text-sm font-semibold text-foreground">Preços de referência (ANP)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {latest
          ? `Última semana: ${anpWeekLabel(latest.week_start, latest.week_end)} · ${num(status.data?.rows ?? 0, 0)} médias`
          : status.isLoading
            ? "Carregando…"
            : "Nenhuma semana importada ainda."}{" "}
        Atualiza sozinho todo dia; a ANP publica às terças.
      </p>
      {result ? (
        <p className="mt-2 text-xs text-foreground">
          {result.status === "imported"
            ? `Importado: ${result.municipios} médias de municípios e ${result.estados} de estados.`
            : result.status === "up_to_date"
              ? "Já estava atualizado."
              : result.status === "not_found"
                ? "A ANP ainda não publicou a semana nova (ou o site não respondeu)."
                : `Erro: ${result.message}`}
        </p>
      ) : null}
      {importer.isError ? (
        <p className="mt-2 text-xs text-destructive">{(importer.error as Error).message}</p>
      ) : null}
      <Action
        variant="secondary"
        size="md"
        className="mt-3"
        loading={importer.isPending}
        onClick={() => importer.mutate()}
      >
        Atualizar agora
      </Action>
    </AppCard>
  );
}

/** Erros do app nos últimos 7 dias (sem nome nem e-mail de quem viu o erro). */
function ErrorsCard() {
  const fetchErrors = useServerFn(recentErrors);
  const errors = useQuery({ queryKey: ["app-errors"], queryFn: () => fetchErrors(), retry: false });
  const data = errors.data;
  return (
    <AppCard>
      <p className="text-sm font-semibold text-foreground">Erros do app (7 dias)</p>
      {errors.isLoading ? (
        <p className="mt-1 text-xs text-muted-foreground">Carregando…</p>
      ) : errors.isError ? (
        <p className="mt-1 text-xs text-destructive">{(errors.error as Error).message}</p>
      ) : !data?.total ? (
        <p className="mt-1 text-xs text-muted-foreground">Nenhum erro registrado. 🎉</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.total} registro{data.total === 1 ? "" : "s"}. Os mais frequentes:
          </p>
          <ul className="mt-3 space-y-3">
            {data.groups.map((g) => (
              <li key={g.message} className="text-xs">
                {g.kind !== "erro" ? (
                  <p className="mb-0.5 font-semibold text-primary">
                    {g.kind === "versao-antiga"
                      ? "Inofensivo: aba aberta antes de uma atualização (o app recarrega sozinho)"
                      : "Inofensivo: o React se recuperou sozinho e a tela funcionou"}
                  </p>
                ) : null}
                <p className="break-words font-medium text-foreground">{g.message}</p>
                <p className="text-muted-foreground">
                  {g.count}× · {g.users} pessoa{g.users === 1 ? "" : "s"} · {g.routes.join(", ")} ·
                  último {fullDate(g.lastSeen)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppCard>
  );
}

/** Comunidade: dicas aguardando aprovação e as que saíram do mural por denúncia. */
function ModerationCard() {
  const client = useQueryClient();
  const fetchQueue = useServerFn(listModeration);
  const moderate = useServerFn(moderatePost);
  const queue = useQuery({ queryKey: ["moderation"], queryFn: () => fetchQueue(), retry: false });
  const act = useMutation({
    mutationFn: (input: { id: string; action: "aprovar" | "excluir" }) => moderate({ data: input }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["moderation"] }),
  });
  const items = queue.data?.items ?? [];

  return (
    <AppCard>
      <p className="text-sm font-semibold text-foreground">Comunidade: revisão</p>
      {queue.isLoading ? (
        <p className="mt-1 text-xs text-muted-foreground">Carregando…</p>
      ) : queue.isError ? (
        <p className="mt-1 text-xs text-destructive">{(queue.error as Error).message}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {items.length
              ? `${items.length} para revisar · ${queue.data?.approved ?? 0} publicadas no mural.`
              : `Nada para revisar. ${queue.data?.approved ?? 0} publicadas no mural.`}
          </p>
          <ul className="mt-3 space-y-3">
            {items.map((item) => {
              const reports = Object.entries(item.reports);
              return (
                <li key={item.id} className="rounded-2xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    {TOPIC_LABEL[item.topic] ?? item.topic} · {fullDate(item.created_at)} ·{" "}
                    {item.status === "pendente" ? "nova" : "denunciada"}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground">
                    {item.content}
                  </p>
                  {reports.length ? (
                    <p className="mt-1 text-xs font-medium text-destructive">
                      Denúncias:{" "}
                      {reports.map(([r, n]) => `${REASON_LABEL[r] ?? r} (${n})`).join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Action
                      size="md"
                      variant="danger"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: item.id, action: "excluir" })}
                    >
                      Excluir
                    </Action>
                    <Action
                      size="md"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: item.id, action: "aprovar" })}
                    >
                      Aprovar
                    </Action>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AppCard>
  );
}
