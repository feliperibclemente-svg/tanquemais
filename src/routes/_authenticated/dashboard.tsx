import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import {
  ActionLink,
  AppCard,
  AppShell,
  EmptyState,
  ErrorState,
  formatCents,
  NumericField,
  PageHeader,
  parseDecimal,
  ScreenSkeleton,
  StatTile,
} from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, kmPerLiter, liters as fmtLiters, num } from "@/lib/format";
import { useHomeData } from "@/hooks/use-tanque";
import { FUEL_LABEL } from "@/constants/app";
import { ethanolAdvice } from "@/services/insights";
import { consumptionPendingText, fullTanksMissing } from "@/services/analytics";

const DashboardCharts = lazy(() => import("@/components/charts/DashboardCharts"));

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
  const { isLoading, isError, refetch, stats, rows } = useHomeData();

  if (isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={3} />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell>
        <PageHeader title="Painel" />
        <ErrorState onRetry={refetch} />
      </AppShell>
    );
  }

  if (rows.length < 2) {
    return (
      <AppShell>
        <PageHeader title="Painel" />
        <EmptyState
          emoji="📊"
          title="Sem dados suficientes"
          description="Registre pelo menos dois abastecimentos para ver gráficos de gasto e consumo."
          action={
            <ActionLink to="/abastecer" size="md" className="mt-1">
              Registrar abastecimento
            </ActionLink>
          }
        />
      </AppShell>
    );
  }

  const series = stats.series.slice(-6);
  const fuelName = stats.fuelTypeId ? (FUEL_LABEL[stats.fuelTypeId] ?? stats.fuelTypeId) : "";
  const lastPrice = (fuel: string) => {
    const r = rows.find((x) => x.fuel_type_id === fuel);
    return r ? Number(r.price_per_liter) : null;
  };
  const gas = lastPrice("gasolina");
  const eth = lastPrice("etanol");

  return (
    <AppShell>
      <PageHeader title="Painel" subtitle="Seus números de consumo e gasto" />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Gasto no mês" value={brl(stats.monthSpend)} />
        <StatTile
          label="Preço médio"
          value={stats.avgPricePerLiter ? `${brl(stats.avgPricePerLiter)}/L` : "—"}
          hint={fuelName}
        />
        <StatTile
          label="Consumo médio"
          value={kmPerLiter(stats.avgKmPerLiter)}
          tone="good"
          hint={stats.avgKmPerLiter ? undefined : consumptionPendingText(fullTanksMissing(rows))}
        />
        <StatTile
          label="Custo por km"
          value={stats.costPerKm ? brl(stats.costPerKm) : "—"}
          hint={`${num(stats.totalKm, 0)} km rodados`}
        />
      </div>

      <section className="mt-5 space-y-4">
        <AppCard>
          <p className="text-sm font-semibold text-foreground">Gasto por mês</p>
          <div className="mt-4">
            <Suspense fallback={<Skeleton className="h-44 w-full rounded-2xl" />}>
              <DashboardCharts series={series} />
            </Suspense>
          </div>
        </AppCard>

        <EthanolCard lastGasoline={gas} lastEthanol={eth} />

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Resumo geral</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Item label="Abastecimentos" value={String(stats.count)} />
            <Item label="Litros abastecidos" value={fmtLiters(stats.totalLiters)} />
            <Item label="Total gasto" value={brl(stats.totalSpend)} />
            <Item
              label={`Preço médio pago (${fuelName})`}
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

const toField = (price: number | null) => (price ? formatCents(price, 3) : "");

/**
 * Regra dos 70% com os preços da bomba de hoje. Começa com os últimos preços pagos pelo
 * usuário, mas os campos são editáveis: o que importa é o preço de agora.
 */
function EthanolCard({
  lastGasoline,
  lastEthanol,
}: {
  lastGasoline: number | null;
  lastEthanol: number | null;
}) {
  const [gasoline, setGasoline] = useState(toField(lastGasoline));
  const [ethanol, setEthanol] = useState(toField(lastEthanol));
  const gas = parseDecimal(gasoline);
  const eth = parseDecimal(ethanol);
  const advice = gas > 0 && eth > 0 ? ethanolAdvice(gas, eth) : null;

  return (
    <AppCard>
      <p className="text-sm font-semibold text-foreground">Etanol ou gasolina?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Digite os preços da bomba de hoje. Usamos a regra dos 70%.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumericField
          label="Gasolina"
          value={gasoline}
          onChange={setGasoline}
          prefix="R$"
          suffix="/L"
          cents={3}
        />
        <NumericField
          label="Etanol"
          value={ethanol}
          onChange={setEthanol}
          prefix="R$"
          suffix="/L"
          cents={3}
        />
      </div>
      {advice ? (
        <p className="mt-3 text-sm text-muted-foreground">
          O etanol custa {num(advice.ratio * 100, 0)}% da gasolina.{" "}
          <span className="font-semibold text-foreground">
            {advice.worth ? "Etanol compensa." : "Gasolina compensa."}
          </span>{" "}
          Com a gasolina a {brl(gas)}/L, o etanol vale a pena até {brl(advice.breakeven)}/L.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Informe os dois preços para comparar.</p>
      )}
    </AppCard>
  );
}
