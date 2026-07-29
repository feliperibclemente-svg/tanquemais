import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, MapPin, Navigation, Star } from "lucide-react";
import { Card, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, num, STATIONS } from "@/lib/tanque";

export const Route = createFileRoute("/postos")({
  head: () => ({
    meta: [
      { title: "Postos próximos — Tanque+" },
      {
        name: "description",
        content: "Postos perto de você ordenados pelo menor preço, com índice de confiabilidade.",
      },
      { property: "og:title", content: "Postos próximos — Tanque+" },
      {
        property: "og:description",
        content: "Compare preços, distância e notas da comunidade antes de abastecer.",
      },
    ],
  }),
  component: Postos,
});

function Postos() {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const stations = [...STATIONS].sort((a, b) => a.gasoline - b.gasoline);
  const cheapest = stations[0];

  return (
    <MobileShell>
      <PageTitle title="Postos próximos" subtitle="Ordenados pelo menor preço" />

      {!allowed ? (
        <Card className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="mt-4 font-medium text-foreground">Permitir localização</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Precisamos da sua localização para mostrar os postos mais baratos por perto.
          </p>
          <button
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                () => setAllowed(true),
                () => setAllowed(true),
              );
              setAllowed(true);
            }}
            className="mt-5 w-full rounded-3xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground"
          >
            Permitir
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="relative h-40 overflow-hidden rounded-3xl border border-border bg-muted">
            <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_30%_40%,var(--primary-soft),transparent_60%),repeating-linear-gradient(0deg,var(--border)_0_1px,transparent_1px_28px),repeating-linear-gradient(90deg,var(--border)_0_1px,transparent_1px_28px)]" />
            {stations.map((s, i) => (
              <span
                key={s.id}
                className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow"
                style={{ left: `${18 + i * 20}%`, top: `${28 + (i % 3) * 20}%` }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <Card className="flex items-start gap-3 border-primary/30 bg-primary-soft">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-accent-foreground">
              Há um posto a {num(cheapest.distanceKm * 1000, 0)} metros com gasolina{" "}
              {brl(STATIONS[1].gasoline - cheapest.gasoline)}/L mais barata.
            </p>
          </Card>

          {stations.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {num(s.distanceKm, 1)} km · {s.hours}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span className="font-semibold text-foreground">{num(s.rating)}</span> (
                    {s.reviews} avaliações)
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-foreground">G {brl(s.gasoline)}</p>
                  <p className="text-muted-foreground">E {brl(s.ethanol)}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                  className="flex-1 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Confiabilidade
                </button>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(s.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <Navigation className="h-4 w-4" /> Ir até o posto
                </a>
              </div>

              {open === s.id && (
                <div className="fade-up mt-4 space-y-2 border-t border-border pt-4">
                  {Object.entries(s.scores).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-24 text-xs capitalize text-muted-foreground">{k}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${(v / 5) * 100}%` }}
                        />
                      </span>
                      <span className="w-8 text-right text-xs font-medium text-foreground">
                        {num(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </MobileShell>
  );
}
