import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { MapPin, Navigation, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Card, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, num } from "@/lib/tanque";
import { RADAR, STATION_CRITERIA, reliability, timeAgo } from "@/lib/community";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar de Economia — Tanque+" },
      {
        name: "description",
        content:
          "Mapa com postos próximos, menor preço, avaliações da comunidade e tendência dos preços.",
      },
      { property: "og:title", content: "Radar de Economia — Tanque+" },
      {
        property: "og:description",
        content: "Descubra onde abastecer mais barato hoje perto de você.",
      },
    ],
  }),
  component: RadarPage,
});

const sorts = [
  { key: "preco", label: "Menor preço" },
  { key: "avaliacao", label: "Melhor avaliação" },
  { key: "movimento", label: "Mais movimentados" },
  { key: "distancia", label: "Mais próximos" },
] as const;

const TANK = 40;

function RadarPage() {
  const [sort, setSort] = useState<(typeof sorts)[number]["key"]>("preco");
  const [open, setOpen] = useState<string | null>(null);

  const busyRank = { Alto: 3, Médio: 2, Baixo: 1 } as const;
  const list = [...RADAR].sort((a, b) => {
    if (sort === "avaliacao") return b.rating - a.rating;
    if (sort === "movimento") return busyRank[b.busy] - busyRank[a.busy];
    if (sort === "distancia") return a.distanceKm - b.distanceKm;
    return a.gasoline - b.gasoline;
  });
  const worst = Math.max(...RADAR.map((r) => r.gasoline));

  return (
    <MobileShell>
      <PageTitle title="Radar de Economia" subtitle="Onde abastecer mais barato agora" />

      <div className="relative mb-4 h-48 overflow-hidden rounded-3xl border border-border bg-muted">
        <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_35%_45%,var(--primary-soft),transparent_60%),repeating-linear-gradient(0deg,var(--border)_0_1px,transparent_1px_26px),repeating-linear-gradient(90deg,var(--border)_0_1px,transparent_1px_26px)]" />
        {list.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setOpen(s.id)}
            className="absolute flex flex-col items-center"
            style={{ left: `${16 + i * 21}%`, top: `${26 + (i % 3) * 19}%` }}
          >
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow">
              {brl(s.gasoline)}
            </span>
            <MapPin className="h-4 w-4 text-primary" />
          </button>
        ))}
        <span className="absolute bottom-3 left-3 rounded-full bg-card/90 px-3 py-1 text-[10px] font-medium text-muted-foreground">
          Mapa interativo · sua região
        </span>
      </div>

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {sorts.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium ${
              sort === s.key
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((s) => {
          const rel = reliability(s.confirmations);
          const economy = (worst - s.gasoline) * TANK;
          const up = s.trend > 0;
          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.city} · {num(s.distanceKm)} km · movimento {s.busy.toLowerCase()}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span className="font-semibold text-foreground">{num(s.rating)}</span> ·
                    atualizado {timeAgo(s.updatedAt)} · {rel.label}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-foreground">G {brl(s.gasoline)}</p>
                  <p className="text-muted-foreground">E {brl(s.ethanol)}</p>
                  <p
                    className={`mt-1 flex items-center justify-end gap-1 text-xs ${up ? "text-destructive" : "text-primary"}`}
                  >
                    {up ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {brl(Math.abs(s.trend))}/L
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">
                    Economia estimada (tanque de 40 L)
                  </p>
                  <p className="text-sm font-semibold text-primary">{brl(economy)}</p>
                </div>
                <div className="h-10 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.history}>
                      <Tooltip formatter={(v: number) => brl(v)} labelFormatter={() => ""} />
                      <Line dataKey="price" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                  className="flex-1 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  Avaliações
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
                  {STATION_CRITERIA.map((c, i) => {
                    const score = Math.max(3.2, s.rating - (i % 3) * 0.3);
                    return (
                      <div key={c} className="flex items-center gap-3">
                        <span className="w-36 text-xs text-muted-foreground">{c}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </span>
                        <span className="w-8 text-right text-xs font-medium text-foreground">
                          {num(score)}
                        </span>
                      </div>
                    );
                  })}
                  <button className="mt-2 w-full rounded-2xl border border-primary/40 px-4 py-2 text-xs font-semibold text-primary">
                    Avaliar este posto
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Link
        to="/postos"
        className="mt-4 flex items-center justify-center rounded-3xl border border-border bg-card px-6 py-4 text-sm font-semibold text-foreground"
      >
        Ver lista simples de postos
      </Link>
    </MobileShell>
  );
}
