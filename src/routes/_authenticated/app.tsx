import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Fuel, Sparkles } from "lucide-react";
import {
  ActionLink,
  AppCard,
  AppShell,
  ErrorState,
  ScreenSkeleton,
  VerdictPill,
} from "@/components/ds";
import { useHomeData } from "@/hooks/use-tanque";
import { brl, kmPerLiter, num, relativeDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import { phraseInsight } from "@/lib/tanque-ia.functions";
import { historyVerdicts } from "@/services/verdict";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Início — Tanque+" },
      {
        name: "description",
        content: "Registre seu abastecimento em segundos e descubra na hora se você economizou.",
      },
      { property: "og:title", content: "Início — Tanque+" },
      {
        property: "og:description",
        content: "Um toque para registrar o abastecimento e saber se o preço foi bom.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function HomePage() {
  const { isLoading, isError, refetch, profile, primaryVehicle, stats, insights, rows } =
    useHomeData();

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

  const firstName = (profile?.full_name ?? "").split(" ")[0];
  const last = stats.last;
  const verdict = last ? historyVerdicts(rows).get(last.id) : undefined;

  if (!primaryVehicle) {
    return (
      <AppShell fab={false}>
        <header>
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Tanque+</h1>
        </header>
        <AppCard className="mt-5 text-center">
          <p className="text-lg font-semibold text-foreground">
            Cadastre seu veículo para começar.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Com o veículo cadastrado a gente calcula consumo, gasto e custo por quilômetro.
          </p>
          <ActionLink to="/veiculo" size="lg" className="mt-4">
            Adicionar veículo
          </ActionLink>
        </AppCard>
      </AppShell>
    );
  }

  return (
    <AppShell fab={false}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
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
          className="h-20 rounded-3xl text-lg shadow-[0_18px_40px_-18px_var(--primary)]"
        >
          <Fuel className="h-6 w-6" strokeWidth={2.4} />
          Registrar abastecimento
        </ActionLink>

        {/* Último abastecimento com a conclusão em destaque */}
        {last ? (
          <Link to="/historico" className="block">
            <AppCard className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Último abastecimento</p>
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
            </AppCard>
          </Link>
        ) : (
          <AppCard className="text-center">
            <p className="font-semibold text-foreground">Comece pelo primeiro abastecimento</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Leva poucos segundos e já dizemos se o preço foi bom.
            </p>
          </AppCard>
        )}

        {/* Três números que geram decisão */}
        <div className="grid grid-cols-3 gap-3">
          <Mini
            label="Gasto no mês"
            value={stats.monthSpend > 0 ? brl(stats.monthSpend) : "—"}
            hint="abastecimentos do mês"
          />
          <Mini
            label="Preço médio"
            value={stats.avgPricePerLiter ? `${brl(stats.avgPricePerLiter)}` : "—"}
            hint="por litro"
          />
          <Mini label="Consumo" value={kmPerLiter(stats.avgKmPerLiter)} hint="média km/L" />
        </div>

        {/* TanqueIA em uma frase — detalhes ficam no painel */}
        <TanqueIALine
          insights={insights}
          vehicleLabel={
            primaryVehicle ? `${primaryVehicle.brand} ${primaryVehicle.model}` : undefined
          }
        />
      </motion.div>
    </AppShell>
  );
}

function Mini({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "good";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-1 truncate text-base font-semibold tracking-tight ${
          tone === "good" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function TanqueIALine({
  insights,
  vehicleLabel,
}: {
  insights: ReturnType<typeof useHomeData>["insights"];
  vehicleLabel?: string;
}) {
  const main = insights[0];
  /** Sem dados suficientes a IA não é acionada: ela interpreta números, não os inventa. */
  const hasData = !!main && main.id !== "empty";
  const facts = insights.slice(0, 3).map((i) => `${i.title}: ${i.body}`);
  const phrase = useServerFn(phraseInsight);

  const ai = useQuery({
    queryKey: ["tanque-ia", facts],
    enabled: hasData && facts.length > 0,
    staleTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      track("tanque_ia_requested", { facts: facts.length });
      return phrase({ data: { facts, vehicle: vehicleLabel } });
    },
  });

  useEffect(() => {
    if (ai.data?.text) track("tanque_ia_answered", { length: ai.data.text.length });
  }, [ai.data?.text]);

  const text =
    ai.data?.text ??
    main?.body ??
    "Registre mais abastecimentos para receber recomendações personalizadas.";

  return (
    <AppCard className="border-primary/25 bg-accent/40">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <p className="text-sm font-semibold text-foreground">TanqueIA</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">
        {ai.isFetching ? "Analisando seus números…" : text}
      </p>
      <Link
        to="/dashboard"
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
      >
        Ver detalhes <ArrowRight className="h-4 w-4" />
      </Link>
    </AppCard>
  );
}
