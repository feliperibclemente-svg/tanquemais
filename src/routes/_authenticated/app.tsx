import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Fuel, Gauge } from "lucide-react";
import {
  ActionLink,
  AppCard,
  AppShell,
  ErrorState,
  InstallCard,
  ReminderCard,
  TeoAvatar,
  ScreenSkeleton,
  VerdictPill,
} from "@/components/ds";
import { useHomeData } from "@/hooks/use-tanque";
import { FUEL_LABEL } from "@/constants/app";
import { brl, kmPerLiter, num, relativeDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { phraseInsight } from "@/lib/tanque-ia.functions";
import { historyVerdicts } from "@/services/verdict";
import {
  consumptionProgress,
  consumptionProgressText,
  fuelingReminder,
  type ConsumptionProgress,
} from "@/services/analytics";
import { firstNameOf, needsIdentity } from "@/services/identity";
import { weekLabel, type ChosenReference } from "@/services/anp";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Início — Tanque+" },
      {
        name: "description",
        content: "Registre seus abastecimentos em segundos e acompanhe gastos e consumo reais.",
      },
      { property: "og:title", content: "Início — Tanque+" },
      {
        property: "og:description",
        content: "Um toque para registrar o abastecimento e acompanhar quanto o carro gasta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

const monthName = () => new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function HomePage() {
  const {
    isLoading,
    isError,
    refetch,
    profile,
    primaryVehicle,
    stats,
    insights,
    rows,
    lastReference,
    hasPlace,
  } = useHomeData();

  if (isLoading) {
    return (
      <AppShell fab={false}>
        <ScreenSkeleton cards={2} />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell fab={false}>
        <ErrorState onRetry={refetch} />
      </AppShell>
    );
  }

  const firstName = firstNameOf(profile);
  const last = stats.last;
  const verdict = last ? historyVerdicts(rows).get(last.id) : undefined;
  const reminder = fuelingReminder(rows);
  const fuelName = stats.fuelTypeId ? (FUEL_LABEL[stats.fuelTypeId] ?? stats.fuelTypeId) : "";
  const consumption = consumptionProgress(rows, stats.avgKmPerLiter);

  if (needsIdentity(profile) || !primaryVehicle) {
    // Primeiro acesso: o cadastro guiado leva direto ao primeiro abastecimento.
    return <Navigate to="/boas-vindas" replace />;
  }

  return (
    <AppShell fab={false}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        <header>
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {primaryVehicle
              ? primaryVehicle.nickname || `${primaryVehicle.brand} ${primaryVehicle.model}`
              : "Tanque+"}
          </h1>
        </header>

        {/* Ação principal — o elemento de maior destaque da tela */}
        <ActionLink
          to="/abastecer"
          size="lg"
          className="h-16 rounded-3xl text-lg shadow-[0_18px_40px_-18px_var(--primary)]"
        >
          <Fuel className="h-6 w-6" strokeWidth={2.4} />
          Registrar abastecimento
        </ActionLink>

        {reminder && last ? (
          <ReminderCard
            lastId={last.id}
            daysSince={reminder.daysSince}
            typicalDays={reminder.typicalDays}
          />
        ) : null}

        {/* Último abastecimento com a conclusão em destaque */}
        {last ? (
          <>
            <Link to="/historico" className="block">
              <AppCard className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Último abastecimento
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      {brl(Number(last.total_cost))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {relativeDate(last.filled_at)} · {brl(Number(last.price_per_liter))}/L ·{" "}
                      {num(Number(last.liters), 1)} L
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                {verdict ? <VerdictPill verdict={verdict} /> : null}
                {lastReference ? (
                  <ReferenceLine reference={lastReference} paid={Number(last.price_per_liter)} />
                ) : null}
              </AppCard>
            </Link>
            {!hasPlace ? (
              <Link
                to="/perfil"
                className="-mt-1 block px-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Informe sua cidade no Perfil para comparar com a média de preços da ANP.
              </Link>
            ) : null}
          </>
        ) : (
          <AppCard className="text-center">
            <p className="font-semibold text-foreground">Comece pelo primeiro abastecimento</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Leva uns 20 segundos. Com ele, você já vê o gasto do mês e quanto paga por litro.
            </p>
          </AppCard>
        )}

        {/* Números do veículo principal. Sem registros, nada a mostrar ainda. */}
        {stats.count > 0 ? (
          <>
            <div
              className={`grid grid-cols-2 gap-3 ${consumption.state === "ready" ? "min-[380px]:grid-cols-3" : ""}`}
            >
              <Mini
                label="Gasto no mês"
                value={brl(stats.monthSpend)}
                hint={
                  stats.monthSpend > 0
                    ? `desde o dia 1º de ${monthName()}`
                    : `nenhum abastecimento em ${monthName()}`
                }
              />
              <Mini
                label="Preço médio"
                value={stats.avgPricePerLiter ? brl(stats.avgPricePerLiter) : "—"}
                hint={`por litro · ${fuelName}`}
              />
              {consumption.state === "ready" ? (
                <Mini
                  className="col-span-2 min-[380px]:col-span-1"
                  label="Consumo"
                  value={kmPerLiter(stats.avgKmPerLiter)}
                  hint={`medido · ${fuelName}`}
                />
              ) : null}
            </div>
            {consumption.state !== "ready" ? <ConsumptionPending progress={consumption} /> : null}
          </>
        ) : null}

        {/* TanqueIA em uma frase — detalhes ficam no painel */}
        <TanqueIALine
          insights={insights}
          dataKey={`${primaryVehicle.id}:${rows.length}:${rows[0]?.id ?? ""}:${rows[0]?.updated_at ?? ""}`}
        />

        <InstallCard />
      </motion.div>
    </AppShell>
  );
}

function Mini({
  label,
  value,
  hint,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "good";
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-3 ${className}`}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-1 whitespace-nowrap text-[clamp(0.85rem,3.8vw,1rem)] font-semibold tracking-tight ${
          tone === "good" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Média semanal da ANP para comparar com o último preço pago. Neutra e com fonte. */
function ReferenceLine({ reference, paid }: { reference: ChosenReference; paid: number }) {
  const diff = paid - reference.avgPrice;
  const where =
    reference.scope === "municipio" ? `em ${reference.place}` : `no estado (${reference.place})`;
  return (
    <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      Média {where}:{" "}
      <span className="font-semibold text-foreground">{brl(reference.avgPrice)}/L</span>
      {Math.abs(diff) >= 0.005
        ? ` · você pagou ${brl(Math.abs(diff))} ${diff > 0 ? "a mais" : "a menos"}`
        : " · você pagou a média"}
      <br />
      Fonte: ANP, semana de {weekLabel(reference.weekStart, reference.weekEnd)}
    </p>
  );
}

/** Consumo ainda sem medida: explica o motivo, o que fazer e mostra o progresso. */
function ConsumptionPending({
  progress,
}: {
  progress: Exclude<ConsumptionProgress, { state: "ready" }>;
}) {
  const done = progress.state === "pending" ? progress.fullTanks : 1;
  return (
    <AppCard className="flex items-start gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <Gauge className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Consumo ainda não calculado</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {consumptionProgressText(progress)}
        </p>
        {progress.state === "pending" ? (
          <div
            className="mt-2 flex gap-1.5"
            role="img"
            aria-label={`${done} de 2 tanques cheios registrados`}
          >
            {[0, 1].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < done ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </AppCard>
  );
}

function TanqueIALine({
  insights,
  dataKey,
}: {
  insights: ReturnType<typeof useHomeData>["insights"];
  /** Muda quando os registros mudam, para a frase ser refeita. */
  dataKey: string;
}) {
  const main = insights[0];
  /** Sem dados suficientes a IA não é acionada: ela interpreta números, não os inventa. */
  const hasData = !!main && main.id !== "empty";
  const phrase = useServerFn(phraseInsight);

  const ai = useQuery({
    queryKey: ["tanque-ia", dataKey],
    enabled: hasData,
    staleTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      track("tanque_ia_requested");
      return phrase();
    },
  });

  useEffect(() => {
    if (ai.data?.text) track("tanque_ia_answered", { length: ai.data.text.length });
  }, [ai.data?.text]);

  const text =
    ai.data?.text ??
    main?.body ??
    "Com dois tanques cheios, eu calculo o consumo real do seu carro.";

  return (
    <AppCard className="border-primary/25 bg-accent/40">
      <div className="flex items-center gap-3">
        <TeoAvatar spot="home-insight" size="sm" mood="tip" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">Teo</p>
          <p className="text-xs text-muted-foreground">sua TanqueIA</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        {ai.isFetching ? "Analisando seus números…" : text}
      </p>
      {hasData && !ai.isFetching ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Calculado com os seus registros{main ? ` · ${main.title}` : ""}.
        </p>
      ) : null}
      <Link
        to="/dashboard"
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
      >
        Ver detalhes <ArrowRight className="h-4 w-4" />
      </Link>
    </AppCard>
  );
}
