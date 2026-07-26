import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Card, EmptyState, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, fuelComparison, monthlySeries, num, useFillups } from "@/lib/tanque";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel de consumo — Tanque+" },
      { name: "description", content: "Gráficos de gastos, litros, consumo médio e comparação gasolina x etanol." },
      { property: "og:title", content: "Painel de consumo — Tanque+" },
      { property: "og:description", content: "Visualize a evolução do seu consumo e dos seus gastos com combustível." },
    ],
  }),
  component: Dashboard,
});

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

function Dashboard() {
  const fillups = useFillups();
  const data = monthlySeries(fillups.value);
  const cmp = fuelComparison(fillups.value);

  return (
    <MobileShell>
      <PageTitle title="Painel" subtitle="Como seus gastos evoluem" />
      {data.length === 0 ? (
        <EmptyState title="Sem dados ainda" description="Os gráficos aparecem depois do primeiro abastecimento." />
      ) : (
        <div className="space-y-4">
          <ChartCard title="Gastos por mês">
            <BarChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Bar dataKey="gasto" radius={8} fill="var(--chart-1)" />
            </BarChart>
          </ChartCard>

          <ChartCard title="Litros abastecidos">
            <AreaChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${num(v)} L`} />
              <Area dataKey="litros" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Evolução do consumo (km/L)">
            <LineChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `${num(v)} km/L`} />
              <Line dataKey="consumo" stroke="var(--chart-1)" strokeWidth={3} dot={false} />
            </LineChart>
          </ChartCard>

          <Card>
            <p className="mb-4 text-sm font-semibold text-foreground">Gasolina x Etanol</p>
            {cmp.length === 0 ? (
              <p className="text-sm text-muted-foreground">Registre abastecimentos com mais de um combustível.</p>
            ) : (
              <div className="space-y-3">
                {cmp.map((c) => (
                  <div key={c.fuel} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                    <span className="text-sm font-medium capitalize text-foreground">{c.fuel}</span>
                    <span className="text-sm text-muted-foreground">
                      {num(c.consumo)} km/L · {brl(c.custoKm)}/km
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
      <Link
        to="/historico"
        className="mt-4 flex items-center justify-center rounded-3xl border border-border bg-card px-6 py-4 text-sm font-semibold text-foreground"
      >
        Ver histórico
      </Link>
      <Link
        to="/economia"
        className="mt-4 flex items-center justify-center rounded-3xl border border-border bg-card px-6 py-4 text-sm font-semibold text-foreground"
      >
        Ver relatório de economia
      </Link>
    </MobileShell>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-foreground">{title}</p>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
