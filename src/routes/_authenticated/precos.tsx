import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import {
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
  EmptyState,
  ErrorState,
  PageHeader,
  ScreenSkeleton,
  SelectField,
} from "@/components/ds";
import { useAnpCities, useCityPrices, useHomeData, usePriceReferences } from "@/hooks/use-tanque";
import {
  ANP_PAGE_URL,
  MIN_STATIONS_FOR_RANKING,
  normalizeName,
  rankCities,
  referenceFuelName,
  toUf,
  weekLabel,
} from "@/services/anp";
import { cityWeek, cityWeekLines } from "@/services/city-week";
import { BR_UFS } from "@/constants/app";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/precos")({
  head: () => ({
    meta: [
      { title: "Preços por cidade (ANP) — Tanque+" },
      {
        name: "description",
        content: "Cidades com a menor média de preço de combustível, pela pesquisa semanal da ANP.",
      },
    ],
  }),
  component: PricesPage,
});

const FUELS = ["gasolina", "etanol", "diesel"] as const;
const TOP = 5;

function PricesPage() {
  const { place, primaryVehicle } = useHomeData();
  const uf = toUf(place.uf ?? "");
  const vehicleFuel = primaryVehicle?.fuel_type_id;
  const [fuel, setFuel] = useState<string>(
    vehicleFuel && (FUELS as readonly string[]).includes(vehicleFuel) ? vehicleFuel : "gasolina",
  );
  const [area, setArea] = useState<"estado" | "brasil" | null>(null);
  const scope = area ?? (uf ? "estado" : "brasil");

  const prices = useCityPrices(fuel, scope === "estado" ? uf : null);
  const ranking = useMemo(
    () => rankCities(prices.data?.rows ?? [], { uf, city: place.city }),
    [prices.data?.rows, uf, place.city],
  );
  const fuelName = referenceFuelName(fuel).name;
  const areaName = scope === "estado" && uf ? uf : "no Brasil";
  const total = ranking.cities.length;

  return (
    <AppShell>
      <PageHeader title="Preços por cidade" subtitle="Média semanal da ANP" />

      <div className="space-y-3">
        <ChoiceGroup
          label="Combustível"
          value={fuel}
          onChange={setFuel}
          options={FUELS.map((f) => ({ value: f, label: capitalize(referenceFuelName(f).name) }))}
        />
        <ChoiceGroup
          label="Região"
          value={scope}
          onChange={(v) => setArea(v as "estado" | "brasil")}
          options={[
            ...(uf ? [{ value: "estado", label: `Meu estado (${uf})` }] : []),
            { value: "brasil", label: "Brasil" },
          ]}
        />
      </div>

      <CityLookup
        key={`${uf ?? ""}:${place.city ?? ""}`}
        fuel={fuel}
        home={{ uf: uf ?? "", city: place.city ?? "" }}
        tankLiters={primaryVehicle?.tank_liters ?? null}
      />

      {prices.isLoading ? (
        <div className="mt-5">
          <ScreenSkeleton cards={2} />
        </div>
      ) : prices.isError ? (
        <div className="mt-5">
          <ErrorState onRetry={() => prices.refetch()} />
        </div>
      ) : !prices.data?.week || total === 0 ? (
        <div className="mt-5">
          <EmptyState
            emoji="⛽"
            title="Sem dados da ANP para essa escolha"
            description="A pesquisa da semana ainda não chegou ou não cobre essa região e combustível."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <MyCity
            ranking={ranking}
            total={total}
            areaName={areaName}
            hasCity={!!place.city && !!uf}
            inArea={scope === "brasil" || !!uf}
          />

          <AppCard>
            <p className="text-sm font-semibold text-foreground">
              Menores médias de {fuelName} {scope === "estado" ? `em ${uf}` : "no Brasil"}
            </p>
            <ol className="mt-3 divide-y divide-border">
              {ranking.cities.slice(0, TOP).map((c, i) => (
                <li key={`${c.uf}-${c.municipio}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                    {i + 1}º
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {c.label}
                      {scope === "brasil" ? ` (${c.uf})` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {c.stations} postos pesquisados
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {brl(c.avgPrice)}/{referenceFuelName(fuel).unit}
                  </span>
                </li>
              ))}
            </ol>
          </AppCard>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Fonte:{" "}
            <a href={ANP_PAGE_URL} target="_blank" rel="noreferrer" className="underline">
              ANP, Levantamento de Preços de Combustíveis
            </a>
            , semana de {weekLabel(prices.data.week.start, prices.data.week.end)}. A ANP pesquisa
            parte das cidades a cada semana; aqui entram as com {MIN_STATIONS_FOR_RANKING} ou mais
            postos pesquisados. É a média de revenda: cada posto pratica o próprio preço.
          </p>
        </div>
      )}
    </AppShell>
  );
}

function MyCity({
  ranking,
  total,
  areaName,
  hasCity,
  inArea,
}: {
  ranking: ReturnType<typeof rankCities>;
  total: number;
  areaName: string;
  hasCity: boolean;
  inArea: boolean;
}) {
  if (!hasCity) {
    return (
      <AppCard className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm text-foreground">
            Informe sua cidade e estado no Perfil para ver a posição da sua cidade.
          </p>
          <ActionLink to="/perfil" size="sm" variant="secondary" className="mt-2">
            Ir para o Perfil
          </ActionLink>
        </div>
      </AppCard>
    );
  }
  if (!inArea) return null;
  if (ranking.mine && ranking.position) {
    return (
      <AppCard className="border-primary/30 bg-accent/40">
        <p className="text-xs font-medium text-muted-foreground">Sua cidade</p>
        <p className="mt-1 text-base font-semibold text-foreground">
          {ranking.mine.label}: {brl(ranking.mine.avgPrice)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {ranking.position}ª menor média entre {total} cidades pesquisadas{" "}
          {areaName === "no Brasil" ? "no Brasil" : `em ${areaName}`}.
        </p>
      </AppCard>
    );
  }
  return (
    <AppCard className="flex items-start gap-3">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {ranking.mineTooFewStations
          ? `Sua cidade teve menos de ${MIN_STATIONS_FOR_RANKING} postos pesquisados nesta semana, então fica fora da comparação.`
          : "Sua cidade não está na pesquisa da ANP desta semana para esse combustível."}
      </p>
    </AppCard>
  );
}

/** Consulta de qualquer cidade pesquisada pela ANP; abre na cidade do perfil. */
function CityLookup({
  fuel,
  home,
  tankLiters,
}: {
  fuel: string;
  home: { uf: string; city: string };
  tankLiters: number | null;
}) {
  const [uf, setUf] = useState(home.uf);
  const [city, setCity] = useState(home.city);
  const cities = useAnpCities(uf || null);
  // A ANP escreve sem acento ("Goiania"): casa a cidade do perfil com a da lista.
  const selected = cities.data?.find((c) => normalizeName(c) === normalizeName(city)) ?? "";
  const refs = usePriceReferences({ uf, city: selected });
  // Na cidade do perfil, mostra o nome como a pessoa escreveu (com acento).
  const shown = normalizeName(selected) === normalizeName(home.city) ? home.city : selected;
  const week = selected && refs.data ? cityWeek(refs.data, { uf, city: shown }, fuel) : null;
  const lines = week ? cityWeekLines(week, tankLiters) : [];
  if (week?.ref.minPrice) {
    lines.splice(1, 0, `Menor preço pesquisado: ${brl(week.ref.minPrice)}/${week.ref.unit}.`);
  }

  return (
    <AppCard className="mt-4">
      <p className="text-sm font-semibold text-foreground">Consultar cidade</p>
      <div className="mt-3 grid grid-cols-[6.5rem_1fr] gap-2">
        <SelectField
          label="Estado"
          value={uf}
          onChange={(e) => {
            setUf(e.target.value);
            setCity("");
          }}
          options={[{ value: "", label: "UF" }, ...BR_UFS.map((u) => ({ value: u, label: u }))]}
        />
        <SelectField
          label="Cidade"
          value={selected}
          disabled={!uf || cities.isLoading}
          onChange={(e) => setCity(e.target.value)}
          options={[
            { value: "", label: cities.isLoading ? "Carregando…" : "Escolha" },
            ...(cities.data ?? []).map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>
      {week ? (
        <div className="mt-3">
          <p className="text-base font-semibold text-foreground">{week.ref.place}</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Pesquisa da ANP, {weekLabel(week.ref.weekStart, week.ref.weekEnd)}.
          </p>
        </div>
      ) : selected && !refs.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sem pesquisa da ANP para essa cidade e combustível nas últimas semanas.
        </p>
      ) : null}
    </AppCard>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
