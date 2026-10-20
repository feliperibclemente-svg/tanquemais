import { createFileRoute, Link } from "@tanstack/react-router";
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
import { FUEL_LABEL, FUEL_TYPES } from "@/constants/app";
import { ethanolAdvice } from "@/services/insights";
import { consumptionProgress, consumptionProgressText } from "@/services/analytics";
import { chooseReference, weekLabel, type ChosenReference } from "@/services/anp";
import { tipsFor } from "@/content/teo-tips";
import { BEST_PRICE_DAYS, bestPricesByFuel } from "@/services/best-price";
import { estimatedCostPerKm } from "@/services/cost-estimate";
import type { FuelingComputed } from "@/services/analytics";

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
  const { isLoading, isError, refetch, stats, rows, references, place, primaryVehicle } =
    useHomeData();

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
        <div className="mt-5 space-y-4">
          <DrivingTips brand={primaryVehicle?.brand ?? null} />
        </div>
      </AppShell>
    );
  }

  const series = stats.series.slice(-6);
  const fuelName = stats.fuelTypeId ? (FUEL_LABEL[stats.fuelTypeId] ?? stats.fuelTypeId) : "";
  const lastPrice = (fuel: string) => {
    const r = rows.find((x) => x.fuel_type_id === fuel);
    return r ? Number(r.price_per_liter) : null;
  };
  // Sem trechos entre tanques cheios: estimativa pelo km do painel (rotulada como tal).
  const estimate = stats.costPerKm ? null : estimatedCostPerKm(rows);
  const gas = lastPrice("gasolina");
  const eth = lastPrice("etanol");

  return (
    <AppShell>
      <PageHeader title="Painel" subtitle="Seus números de consumo e gasto" />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Gasto no mês"
          value={brl(stats.monthSpend)}
          hint="combustível, mês atual"
        />
        <StatTile
          label="Preço médio"
          value={stats.avgPricePerLiter ? `${brl(stats.avgPricePerLiter)}/L` : "—"}
          hint={`${fuelName}, ponderado por litro`}
        />
        <StatTile
          label="Consumo médio"
          value={kmPerLiter(stats.avgKmPerLiter)}
          tone="good"
          hint={
            stats.avgKmPerLiter
              ? `${fuelName}, entre tanques cheios`
              : consumptionProgressText(consumptionProgress(rows, stats.avgKmPerLiter), "short")
          }
        />
        <StatTile
          label="Combustível por km"
          value={
            stats.costPerKm ? brl(stats.costPerKm) : estimate ? `≈ ${brl(estimate.costPerKm)}` : "—"
          }
          hint={
            stats.costPerKm && stats.totalKm > 0
              ? `em ${num(stats.totalKm, 0)} km medidos`
              : estimate
                ? `estimado pelo km do painel, ${num(estimate.distance, 0)} km`
                : "sem trechos medidos"
          }
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

        <BestPriceCard rows={rows} />

        <EthanolCard
          lastGasoline={gas}
          lastEthanol={eth}
          anpGasoline={chooseReference(references, place, "gasolina", new Date())}
          anpEthanol={chooseReference(references, place, "etanol", new Date())}
        />

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
            <Item label={`Melhor consumo (${fuelName})`} value={kmPerLiter(stats.bestKmPerLiter)} />
            <Item label={`Pior consumo (${fuelName})`} value={kmPerLiter(stats.worstKmPerLiter)} />
          </dl>
        </AppCard>

        <HowWeCalculate duplicates={stats.duplicates} outliers={stats.outliers} />
        <DrivingTips brand={primaryVehicle?.brand ?? null} />
      </section>
    </AppShell>
  );
}

/**
 * Onde você pagou menos: o menor preço por litro registrado pela pessoa, por combustível.
 * Deixa claro que é o preço daquele dia, não uma promessa de que o posto segue mais barato.
 */
function BestPriceCard({ rows }: { rows: FuelingComputed[] }) {
  const best = bestPricesByFuel(rows);
  return (
    <AppCard>
      <p className="text-sm font-semibold text-foreground">Onde você pagou menos</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Menor preço por litro entre os seus abastecimentos dos últimos {BEST_PRICE_DAYS} dias.
      </p>
      {best.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Com 2 abastecimentos do mesmo combustível nesse período, aparece aqui o posto onde você
          pagou menos.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {best.map((b) => {
            const fuel = FUEL_LABEL[b.fuelTypeId] ?? b.fuelTypeId;
            const unit = FUEL_TYPES.find((f) => f.id === b.fuelTypeId)?.unit ?? "L";
            const d = new Date(b.filledAt);
            const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
            return (
              <li key={b.fuelTypeId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{fuel}</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {b.stationName ?? "Posto não informado"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    em {date}
                    {" · "}
                    <Link
                      to="/historico"
                      search={{ abrir: b.fuelingId }}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {b.stationName ? "Ver registro" : "Informar o posto"}
                    </Link>
                  </p>
                </div>
                <p className="shrink-0 text-lg font-extrabold text-foreground tabular-nums">
                  {brl(b.price)}
                  <span className="text-xs font-semibold text-muted-foreground">/{unit}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {best.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          É o preço daquele dia. Hoje pode ser outro.
        </p>
      ) : null}
    </AppCard>
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

const toField = (price: number | null) => (price ? formatCents(price, 2) : "");

/**
 * Regra dos 70% com os preços da bomba de hoje. Começa com os últimos preços pagos pelo
 * usuário, mas os campos são editáveis: o que importa é o preço de agora.
 */
function EthanolCard({
  lastGasoline,
  lastEthanol,
  anpGasoline,
  anpEthanol,
}: {
  lastGasoline: number | null;
  lastEthanol: number | null;
  anpGasoline: ChosenReference | null;
  anpEthanol: ChosenReference | null;
}) {
  // Médias públicas da mesma semana e do mesmo lugar, para quem não sabe o preço do outro combustível.
  const anp =
    anpGasoline &&
    anpEthanol &&
    anpGasoline.weekStart === anpEthanol.weekStart &&
    anpGasoline.scope === anpEthanol.scope
      ? { gasoline: anpGasoline, ethanol: anpEthanol }
      : null;
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
          cents={2}
        />
        <NumericField
          label="Etanol"
          value={ethanol}
          onChange={setEthanol}
          prefix="R$"
          suffix="/L"
          cents={2}
        />
      </div>
      {anp ? (
        <button
          type="button"
          onClick={() => {
            setGasoline(toField(anp.gasoline.avgPrice));
            setEthanol(toField(anp.ethanol.avgPrice));
          }}
          className="mt-2 min-h-11 text-left text-sm font-semibold text-primary"
        >
          Usar as médias da ANP{" "}
          {anp.gasoline.scope === "municipio"
            ? `em ${anp.gasoline.place}`
            : `no estado (${anp.gasoline.place})`}
          <span className="block text-xs font-normal text-muted-foreground">
            semana de {weekLabel(anp.gasoline.weekStart, anp.gasoline.weekEnd)}
          </span>
        </button>
      ) : null}
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

/** Definições curtas de cada indicador, para o usuário saber de onde vem cada número. */
function HowWeCalculate({ duplicates, outliers }: { duplicates: number; outliers: number }) {
  return (
    <details className="rounded-3xl border border-border bg-card p-4 text-sm">
      <summary className="min-h-11 cursor-pointer list-none py-2 font-semibold text-foreground">
        Como calculamos estes números
      </summary>
      <dl className="mt-2 space-y-3 text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Gasto no mês</dt>
          <dd>Soma do valor pago nos abastecimentos do veículo principal desde o dia 1º.</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Preço médio</dt>
          <dd>
            Total pago ÷ litros, só do combustível mais recente. Abastecimentos maiores pesam mais.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Médias da ANP</dt>
          <dd>
            Preço médio semanal pesquisado pela ANP em postos da sua cidade (ou do estado, quando a
            cidade não entra na pesquisa). Dado público, só para referência: cada posto tem o seu
            preço.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Consumo médio</dt>
          <dd>
            Km entre dois tanques cheios ÷ litros colocados nesse trecho. Abastecimentos parciais
            entram na soma de litros. Gasolina e etanol são medidos separadamente.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Combustível por km</dt>
          <dd>
            Valor pago nos trechos medidos ÷ km desses trechos. Sem tanque cheio, mostramos uma
            estimativa (≈): o que você pagou nos últimos 90 dias, menos o último abastecimento, ÷ km
            rodados pelo painel no mesmo período. Não inclui manutenção, impostos ou seguro.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">O que fica de fora</dt>
          <dd>
            Registros repetidos (mesmo km, litros e valor) e trechos com consumo muito diferente do
            seu padrão, que costumam indicar um abastecimento não registrado.
            {duplicates + outliers > 0
              ? ` Hoje: ${duplicates} repetido(s) e ${outliers} trecho(s) atípico(s) — veja no Histórico.`
              : ""}
          </dd>
        </div>
      </dl>
    </details>
  );
}

/** Dicas de uso que tendem a reduzir o consumo (conteúdo revisado, não gerado por IA). */
function DrivingTips({ brand }: { brand: string | null }) {
  return (
    <details className="rounded-3xl border border-border bg-card p-4 text-sm">
      <summary className="min-h-11 cursor-pointer list-none py-2 font-semibold text-foreground">
        Dicas para gastar menos combustível
      </summary>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
        {tipsFor(brand).map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </details>
  );
}
