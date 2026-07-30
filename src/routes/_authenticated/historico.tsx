import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ConfirmAction,
  EmptyState,
  PageHeader,
  ScreenSkeleton,
} from "@/components/ds";
import { FUEL_LABEL } from "@/constants/app";
import { brl, fullDate, kmPerLiter, liters as fmtLiters, num } from "@/lib/format";
import { useDeleteFueling, useFuelings } from "@/hooks/use-tanque";
import { computeFuelings } from "@/services/analytics";
import type { Fueling } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de abastecimentos — Tanque+" },
      {
        name: "description",
        content: "Veja todos os abastecimentos registrados com litros, preço, consumo e custo.",
      },
      { property: "og:title", content: "Histórico de abastecimentos — Tanque+" },
      { property: "og:description", content: "Cada abastecimento com consumo e custo por km." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const fuelings = useFuelings();
  const remove = useDeleteFueling();
  const [open, setOpen] = useState<string | null>(null);

  const rows = computeFuelings((fuelings.data ?? []) as Fueling[]);

  return (
    <AppShell>
      <PageHeader title="Histórico" subtitle="Todos os seus abastecimentos" />

      {fuelings.isLoading ? (
        <ScreenSkeleton cards={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nada por aqui ainda"
          description="Assim que você registrar um abastecimento ele aparece nesta lista."
          action={
            <ActionLink to="/abastecer" size="md" className="mt-1">
              Registrar abastecimento
            </ActionLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const expanded = open === row.id;
            return (
              <li key={row.id}>
                <AppCard className="p-0">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : row.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-start justify-between gap-3 p-5 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {FUEL_LABEL[row.fuel_type_id] ?? row.fuel_type_id}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fullDate(row.filled_at)} · {fmtLiters(Number(row.liters))} ·{" "}
                        {brl(Number(row.price_per_liter))}/L
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{brl(Number(row.total_cost))}</p>
                      <p className="text-xs font-medium text-primary">
                        {kmPerLiter(row.computed_km_per_liter)}
                      </p>
                    </div>
                  </button>

                  {expanded ? (
                    <div className="space-y-2 border-t border-border px-5 py-4 text-sm">
                      <Row label="Odômetro" value={`${num(Number(row.odometer), 0)} km`} />
                      <Row
                        label="Distância percorrida"
                        value={row.distance ? `${num(row.distance, 0)} km` : "—"}
                      />
                      <Row
                        label="Custo por km"
                        value={row.computed_cost_per_km ? brl(row.computed_cost_per_km) : "—"}
                      />
                      <Row label="Tanque cheio" value={row.full_tank ? "Sim" : "Não"} />
                      <ConfirmAction
                        title="Excluir abastecimento?"
                        description="Esse registro sai do histórico e das estatísticas de consumo."
                        onConfirm={() => remove.mutate(row.id)}
                        trigger={
                          <Action variant="danger-ghost" size="sm" className="mt-2 px-0">
                            <Trash2 className="h-4 w-4" /> Excluir abastecimento
                          </Action>
                        }
                      />
                    </div>
                  ) : null}
                </AppCard>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
