import { createFileRoute } from "@tanstack/react-router";
import { Card, EmptyState, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, dateLabel, num, summary, useFillups } from "@/lib/tanque";

export const Route = createFileRoute("/economia")({
  head: () => ({
    meta: [
      { title: "Economia — Tanque+" },
      { name: "description", content: "Veja gasto no mês, nos últimos 12 meses, custo por km e melhores abastecimentos." },
      { property: "og:title", content: "Economia — Tanque+" },
      { property: "og:description", content: "Relatório de quanto você gasta e onde dá para economizar." },
    ],
  }),
  component: Economia,
});

function Economia() {
  const fillups = useFillups();
  const s = summary(fillups.value);

  const last12 = s.stats
    .filter((f) => new Date(f.date) >= new Date(Date.now() - 365 * 864e5))
    .reduce((sum, f) => sum + f.amountPaid, 0);

  return (
    <MobileShell>
      <PageTitle title="Economia" subtitle="Quanto seu carro custa de verdade" />
      {s.stats.length === 0 ? (
        <EmptyState title="Sem dados ainda" description="Registre abastecimentos para ver seu relatório de economia." />
      ) : (
        <div className="space-y-4">
          <Card className="bg-primary text-primary-foreground">
            <p className="text-sm opacity-90">Gasto neste mês</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{brl(s.monthSpend)}</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{brl(last12)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Custo por km</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{brl(s.costPerKm)}</p>
            </Card>
          </div>

          {s.best?.kmPerLiter ? (
            <Card>
              <p className="text-sm font-semibold text-foreground">🏆 Melhor rendimento</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {dateLabel(s.best.date)} · {s.best.station ?? "Abastecimento"} — {num(s.best.kmPerLiter)} km/L
              </p>
            </Card>
          ) : null}
          {s.worst?.kmPerLiter && s.worst.id !== s.best?.id ? (
            <Card>
              <p className="text-sm font-semibold text-foreground">⚠️ Pior rendimento</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {dateLabel(s.worst.date)} · {s.worst.station ?? "Abastecimento"} — {num(s.worst.kmPerLiter)} km/L
              </p>
            </Card>
          ) : null}

          <Card>
            <p className="text-sm font-semibold text-foreground">💡 Economia potencial</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Abastecendo sempre no menor preço que você já registrou ({brl(s.savings)} de diferença acumulada),
              seu custo por km cairia de forma consistente.
            </p>
          </Card>
        </div>
      )}
    </MobileShell>
  );
}
