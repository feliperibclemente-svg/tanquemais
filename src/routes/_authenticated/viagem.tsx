import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Route as RouteIcon } from "lucide-react";
import {
  actionVariants,
  AppCard,
  AppShell,
  ChoiceGroup,
  ErrorState,
  formatCents,
  NumericField,
  PageHeader,
  parseDecimal,
  ScreenSkeleton,
  TextField,
} from "@/components/ds";
import { useHomeData } from "@/hooks/use-tanque";
import { FUEL_LABEL, FUEL_TYPES } from "@/constants/app";
import { vehicleWords } from "@/constants/vehicles";
import { brl, num } from "@/lib/format";
import { chooseReference } from "@/services/anp";
import { mapsDirectionsUrl, simulateTrip, tanksText } from "@/services/trip";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/viagem")({
  head: () => ({
    meta: [
      { title: "Simular viagem — Tanque+" },
      {
        name: "description",
        content: "Estimativa de litros e gasto de combustível de uma viagem, com o seu consumo.",
      },
    ],
  }),
  component: TripPage,
});

/**
 * Simulação de viagem: uma estimativa com o consumo real da pessoa (ou um que ela informar).
 * Não promete nada: o texto deixa claro que é simulação. Postos no caminho ficam com o
 * aplicativo de mapas, com o carro parado, antes de sair.
 */
function TripPage() {
  const { isLoading, isError, refetch, stats, rows, primaryVehicle, references, place } =
    useHomeData();

  if (isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={2} />
      </AppShell>
    );
  }
  if (isError) {
    return (
      <AppShell>
        <PageHeader title="Simular viagem" />
        <ErrorState onRetry={refetch} />
      </AppShell>
    );
  }

  const fuel = stats.fuelTypeId ?? primaryVehicle?.fuel_type_id ?? "gasolina";
  const lastPaid = rows.find((r) => r.fuel_type_id === fuel && Number(r.price_per_liter) > 0);
  const anp = chooseReference(references, place, fuel, new Date());
  const defaults = {
    fuel,
    kml: stats.avgKmPerLiter,
    price: lastPaid ? Number(lastPaid.price_per_liter) : (anp?.avgPrice ?? null),
    priceSource: lastPaid
      ? "último preço que você pagou"
      : anp
        ? `média da ANP em ${anp.place}`
        : null,
    tankLiters: primaryVehicle?.tank_liters ?? null,
    words: vehicleWords(primaryVehicle?.brand ?? null),
  };

  return (
    <AppShell>
      <PageHeader title="Simular viagem" subtitle="Quanto de combustível a viagem pode custar" />
      <TripForm {...defaults} />
    </AppShell>
  );
}

function TripForm({
  fuel,
  kml: realKml,
  price: defaultPrice,
  priceSource,
  tankLiters,
  words,
}: {
  fuel: string;
  kml: number | null;
  price: number | null;
  priceSource: string | null;
  tankLiters: number | null;
  words: ReturnType<typeof vehicleWords>;
}) {
  const unit = FUEL_TYPES.find((f) => f.id === fuel)?.unit ?? "L";
  const fuelName = (FUEL_LABEL[fuel] ?? fuel).toLowerCase();
  const [km, setKm] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [kml, setKml] = useState(realKml ? num(realKml, 1) : "");
  const [price, setPrice] = useState(defaultPrice ? formatCents(defaultPrice, 2) : "");
  const [destination, setDestination] = useState("");

  const kmlValue = parseDecimal(kml);
  const usingReal = !!realKml && kml === num(realKml, 1);
  const result = simulateTrip({
    km: parseDecimal(km),
    roundTrip,
    kmPerLiter: kmlValue,
    price: parseDecimal(price),
    tankLiters,
  });

  const tracked = useRef(false);
  useEffect(() => {
    if (!result || tracked.current) return;
    tracked.current = true;
    track("trip_simulated", { real_consumption: usingReal, round_trip: roundTrip });
  }, [result, usingReal, roundTrip]);

  return (
    <div className="space-y-5">
      <NumericField
        label="Distância de ida"
        value={km}
        onChange={setKm}
        inputMode="numeric"
        suffix="km"
        hint="Não sabe? Veja no aplicativo de mapas (o link está mais abaixo)."
      />
      <ChoiceGroup
        label="Trajeto"
        fill
        value={roundTrip ? "ida-volta" : "ida"}
        onChange={(v) => setRoundTrip(v === "ida-volta")}
        options={[
          { value: "ida", label: "Só ida" },
          { value: "ida-volta", label: "Ida e volta" },
        ]}
      />
      <NumericField
        label={`Consumo (km/${unit})`}
        value={kml}
        onChange={setKml}
        suffix={`km/${unit}`}
        hint={
          usingReal
            ? `Consumo real ${words.ofThe} com ${fuelName}, medido nos seus tanques cheios.`
            : realKml
              ? `Você mudou o consumo. O medido nos seus registros é ${num(realKml, 1)} km/${unit}.`
              : "Ainda não tenho seu consumo medido. Informe uma estimativa, como a do manual."
        }
      />
      <NumericField
        label={`Preço do ${unit === "L" ? "litro" : "m³"} (${fuelName})`}
        value={price}
        onChange={setPrice}
        prefix="R$"
        suffix={`/${unit}`}
        cents={2}
        hint={priceSource ? `Preenchido com o ${priceSource}. Pode mudar.` : undefined}
      />

      {result ? (
        <AppCard className="border-primary/30 bg-accent/40" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Simulação</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            cerca de {brl(result.cost, 0)}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {num(result.liters, 0)} {unit === "L" ? "litros" : "m³"} de {fuelName} para{" "}
            {num(result.distance, 0)} km{roundTrip ? " (ida e volta)" : ""}
            {result.tanks !== null ? `, ${tanksText(result.tanks)}` : ""}.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            É só uma estimativa. Na estrada o consumo muda com velocidade, serra, carga,
            ar-condicionado e trânsito. Leve uma margem.
          </p>
        </AppCard>
      ) : (
        <p className="text-sm text-muted-foreground">
          Preencha a distância, o consumo e o preço para ver a simulação.
        </p>
      )}

      <AppCard>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <RouteIcon className="h-4 w-4 text-primary" /> Trajeto e postos no caminho
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Abra o trajeto no Google Maps para ver a distância e buscar postos na rota. Faça isso
          antes de sair ou com {words.the} {words.parked}.
        </p>
        <div className="mt-3 space-y-3">
          <TextField
            label="Destino"
            value={destination}
            placeholder="Ex.: Caldas Novas, GO"
            autoComplete="off"
            onChange={(event) => setDestination(event.target.value)}
          />
          {destination.trim().length >= 3 ? (
            <a
              href={mapsDirectionsUrl(destination)}
              target="_blank"
              rel="noopener noreferrer"
              className={actionVariants({ variant: "secondary", size: "md" })}
              onClick={() => track("trip_maps_opened")}
            >
              <ExternalLink className="h-4 w-4" /> Abrir no Google Maps
            </a>
          ) : null}
        </div>
      </AppCard>
    </div>
  );
}
