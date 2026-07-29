import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, EmptyState, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, dateLabel, num, useFillups, withStats } from "@/lib/tanque";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de abastecimentos — Tanque+" },
      {
        name: "description",
        content: "Todos os seus abastecimentos com litros, preço por litro e km/L.",
      },
      { property: "og:title", content: "Histórico de abastecimentos — Tanque+" },
      {
        property: "og:description",
        content: "Consulte data, posto, valor, litros e rendimento de cada abastecimento.",
      },
    ],
  }),
  component: Historico,
});

function Historico() {
  const fillups = useFillups();
  const [open, setOpen] = useState<string | null>(null);
  const rows = withStats(fillups.value);

  return (
    <MobileShell>
      <PageTitle title="Histórico" subtitle="Seus abastecimentos em ordem cronológica" />
      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum abastecimento ainda"
          description="Registre o primeiro abastecimento para começar a acompanhar seu consumo."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f.id}>
              <button
                className="w-full text-left"
                onClick={() => setOpen(open === f.id ? null : f.id)}
              >
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{f.station ?? "Abastecimento"}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateLabel(f.date)} · {brl(f.pricePerLiter)}/L · {num(f.liters, 2)} L
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{brl(f.amountPaid)}</p>
                      <p className="text-xs text-primary">
                        {f.kmPerLiter ? `${num(f.kmPerLiter)} km/L` : "—"}
                      </p>
                    </div>
                  </div>
                  {open === f.id && (
                    <div className="fade-up mt-4 space-y-2 border-t border-border pt-4 text-sm">
                      <Detail label="Combustível" value={f.fuel} />
                      <Detail label="Odômetro" value={`${num(f.odometer, 0)} km`} />
                      <Detail
                        label="Distância percorrida"
                        value={f.distance ? `${num(f.distance, 0)} km` : "—"}
                      />
                      <Detail label="Custo por km" value={f.costPerKm ? brl(f.costPerKm) : "—"} />
                    </div>
                  )}
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize text-foreground">{value}</span>
    </div>
  );
}
