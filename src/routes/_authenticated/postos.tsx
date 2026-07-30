import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, ShieldCheck, Star } from "lucide-react";
import {
  AppCard,
  AppShell,
  ChoiceGroup,
  EmptyState,
  PageHeader,
  ScreenSkeleton,
} from "@/components/ds";
import { FUEL_LABEL, FUEL_TYPES, reliabilityFromConfirmations } from "@/constants/app";
import { brl, num, relativeDate } from "@/lib/format";
import { useProfile, useStations } from "@/hooks/use-tanque";

export const Route = createFileRoute("/_authenticated/postos")({
  head: () => ({
    meta: [
      { title: "Postos e preços — Tanque+" },
      {
        name: "description",
        content:
          "Compare preços de combustível por posto, com índice de confiabilidade da comunidade.",
      },
      { property: "og:title", content: "Postos e preços — Tanque+" },
      {
        property: "og:description",
        content: "Preços por combustível e confiabilidade de cada posto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostosPage,
});

function PostosPage() {
  const profile = useProfile();
  const [fuel, setFuel] = useState("gasolina");
  const stations = useStations(profile.data?.city ?? null);

  const list = (stations.data ?? [])
    .map((s) => ({
      station: s,
      price: (s.station_prices ?? []).find((p) => p.fuel_type_id === fuel) ?? null,
    }))
    .sort((a, b) => (a.price?.price ?? Infinity) - (b.price?.price ?? Infinity));

  return (
    <AppShell>
      <PageHeader title="Postos" subtitle="Preços informados pela comunidade" />

      <ChoiceGroup
        label="Combustível"
        className="mb-4"
        value={fuel}
        onChange={setFuel}
        options={FUEL_TYPES.map((f) => ({ value: f.id, label: f.short }))}
      />

      {stations.isLoading ? (
        <ScreenSkeleton cards={3} />
      ) : list.length === 0 ? (
        <EmptyState
          emoji="📍"
          title="Nenhum posto por aqui"
          description="Ainda não temos postos cadastrados na sua região."
        />
      ) : (
        <ul className="space-y-3">
          {list.map(({ station, price }) => {
            const reliability = reliabilityFromConfirmations(price?.confirmations ?? 0);
            return (
              <li key={station.id}>
                <AppCard>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{station.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {station.address || station.city || "Endereço não informado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {price ? `${brl(Number(price.price))}` : "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {FUEL_LABEL[fuel]} · por litro
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-primary" />
                      {num(Number(station.rating))} ({station.reviews_count})
                    </span>
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        reliability.tone === "good" ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Confiabilidade {reliability.label.toLowerCase()}
                    </span>
                    {price ? <span>Atualizado {relativeDate(price.reported_at)}</span> : null}
                  </div>
                </AppCard>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
