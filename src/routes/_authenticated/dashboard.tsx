import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { AppCard, EmptyState, PageHeader, ScreenSkeleton, StatTile } from "@/components/app/Surface";
import { brl, kmPerLiter, liters as fmtLiters, num } from "@/lib/format";
import { useHomeData } from "@/hooks/use-tanque";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel de consumo e gastos — Tanque+" },
      {
        name: "description",
        content: "Gráficos de gasto mensal, litros e consumo médio do seu veículo no Tanque+.",
      },
      { property: "og:title", content: "Painel de consumo e gastos — Tanque+" },
      { property: "og:description", content: "Gasto mensal, litros abastecidos e consumo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isLoading, stats, rows } = useHomeData();

  if (isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={3} />
      </AppShell>
    );
  }

  if (rows.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Painel" />
        <EmptyState
          emoji="📊"
          title="Sem dados suficientes"
          description="Registre pelo menos dois abastecimentos para ver gráficos de gasto e consumo."
          action={
            <Link
              to="/abastecer"
              className="mt-1 flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Registrar abastecimento
            </Link>
          }
        />
      </AppShell>
    );
  }

  const series = stats.series.slice(-6);
  const annual = stats.monthSpend * 12;

  return (
    <AppShell>
      <PageHeader title="Painel" subtitle="Seus números de consumo e gasto" />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Gasto no mês" value={brl(stats.monthSpend)} />
        <StatTile label="Projeção anual" value={brl(annual)} hint="No ritmo atual" />
        <StatTile label="Consumo médio" value={kmPerLiter(stats.avgKmPerLiter)} tone="good" />
        <StatTile
          label="Custo por km"
          value={stats.costPerKm ? brl(stats.costPerKm) : "—"}
          hint={`${num(stats.totalKm, 0)} km rodados`}
        />
      </div>

      <section className="mt-5 space-y-4">
        <AppCard>
          <p className="text-sm font-semibold text-foreground">Gasto por mês</p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Bar dataKey="gasto" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppCard>

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Consumo (km/L)</p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  formatter={(v: number) => `${num(v)} km/L`}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="consumo"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AppCard>

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Resumo geral</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Item label="Abastecimentos" value={String(stats.count)} />
            <Item label="Litros abastecidos" value={fmtLiters(stats.totalLiters)} />
            <Item label="Total gasto" value={brl(stats.totalSpend)} />
            <Item
              label="Preço médio pago"
              value={stats.avgPricePerLiter ? `${brl(stats.avgPricePerLiter)}/L` : "—"}
            />
            <Item label="Melhor consumo" value={kmPerLiter(stats.bestKmPerLiter)} />
            <Item label="Pior consumo" value={kmPerLiter(stats.worstKmPerLiter)} />
          </dl>
        </AppCard>
      </section>
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
