import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowRight, Fuel, PiggyBank, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { AppCard, EmptyState, ScreenSkeleton, SectionHeader } from "@/components/app/Surface";
import { useHomeData } from "@/hooks/use-tanque";
import { brl, kmPerLiter, liters as fmtLiters, num, relativeDate } from "@/lib/format";
import { FUEL_LABEL } from "@/constants/app";
import { phraseInsight } from "@/lib/tanque-ia.functions";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Início — Tanque+" },
      {
        name: "description",
        content: "Seu resumo de gastos, economia possível e recomendações da TanqueIA.",
      },
      { property: "og:title", content: "Início — Tanque+" },
      { property: "og:description", content: "Gasto do mês, economia possível e consumo real." },
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
  const { isLoading, profile, primaryVehicle, stats, savings, insights, rows } = useHomeData();

  if (isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={4} />
      </AppShell>
    );
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0];
  const last = stats.last;
  const spark = stats.series.slice(-6);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        <header>
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {primaryVehicle
              ? primaryVehicle.nickname || `${primaryVehicle.brand} ${primaryVehicle.model}`
              : "Vamos economizar"}
          </h1>
        </header>

        {/* Economia possível */}
        <AppCard className="bg-primary text-primary-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15">
              <PiggyBank className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium opacity-90">Economia possível hoje</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                {savings.amount > 0 ? brl(savings.amount) : "—"}
              </p>
              <p className="mt-1 text-sm opacity-90">
                {savings.amount > 0 && savings.stationName
                  ? `Abastecendo no ${savings.stationName} a ${brl(savings.cheapestPrice ?? 0)}/L no próximo tanque de ${num(savings.liters, 0)} L.`
                  : "Registre um abastecimento para calcularmos sua economia possível."}
              </p>
            </div>
          </div>
          <Link
            to="/postos"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary-foreground text-sm font-semibold text-primary transition-transform active:scale-[0.98]"
          >
            Ver postos <ArrowRight className="h-4 w-4" />
          </Link>
        </AppCard>

        {/* Gasto do mês */}
        <AppCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Gasto deste mês</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {brl(stats.monthSpend)}
              </p>
              {stats.monthDelta != null ? (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                    stats.monthDelta > 0 ? "text-destructive" : "text-primary"
                  }`}
                >
                  {stats.monthDelta > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {num(Math.abs(stats.monthDelta) * 100)}% vs. mês anterior
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Sem comparação ainda</p>
              )}
            </div>
            <div className="h-16 w-28">
              {spark.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spark}>
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="gasto"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#sparkFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </AppCard>

        {/* TanqueIA */}
        <TanqueIACard insights={insights} vehicleLabel={primaryVehicle ? `${primaryVehicle.brand} ${primaryVehicle.model}` : undefined} />

        {/* Último abastecimento */}
        <section>
          <SectionHeader title="Último abastecimento" action={{ label: "Ver tudo", to: "/historico" }} />
          {last ? (
            <AppCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {FUEL_LABEL[last.fuel_type_id] ?? last.fuel_type_id}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {relativeDate(last.filled_at)} · {fmtLiters(Number(last.liters))} ·{" "}
                    {brl(Number(last.price_per_liter))}/L
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{brl(Number(last.total_cost))}</p>
                  <p className="text-xs font-medium text-primary">
                    {kmPerLiter(last.computed_km_per_liter)}
                  </p>
                </div>
              </div>
            </AppCard>
          ) : (
            <EmptyState
              title="Nenhum abastecimento ainda"
              description="Registre o primeiro para ver consumo, custo por km e economia."
              action={
                <Link
                  to="/abastecer"
                  className="mt-1 flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  <Fuel className="h-4 w-4" /> Registrar agora
                </Link>
              }
            />
          )}
        </section>

        {rows.length > 0 ? (
          <p className="pb-2 text-center text-xs text-muted-foreground">
            {rows.length} abastecimento{rows.length > 1 ? "s" : ""} · {brl(stats.totalSpend)} no total
          </p>
        ) : null}
      </motion.div>
    </AppShell>
  );
}

function TanqueIACard({
  insights,
  vehicleLabel,
}: {
  insights: ReturnType<typeof useHomeData>["insights"];
  vehicleLabel?: string;
}) {
  const main = insights[0];
  const facts = insights.slice(0, 4).map((i) => `${i.title}: ${i.body}`);
  const phrase = useServerFn(phraseInsight);

  const ai = useQuery({
    queryKey: ["tanque-ia", facts],
    enabled: facts.length > 0,
    staleTime: 15 * 60_000,
    retry: 1,
    queryFn: () => phrase({ data: { facts, vehicle: vehicleLabel } }),
  });

  const text = ai.data?.text ?? main?.body ?? "Registre mais abastecimentos para receber recomendações personalizadas.";

  return (
    <AppCard className="border-primary/25 bg-accent/40">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">TanqueIA</p>
          <p className="text-[11px] text-muted-foreground">
            {ai.isFetching ? "Analisando seus dados…" : "Baseado nos seus números"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-base leading-relaxed text-foreground">{text}</p>

      {insights.length > 1 ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {insights.slice(1, 4).map((insight) => (
            <li key={insight.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{insight.title}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {main?.action ? (
        <Link
          to={main.action.to}
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
        >
          {main.action.label} <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </AppCard>
  );
}
