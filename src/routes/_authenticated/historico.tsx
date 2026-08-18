import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { VerdictPill } from "@/components/app/Verdict";
import { FUEL_LABEL } from "@/constants/app";
import { brl, fullDate, kmPerLiter, num, shortDate } from "@/lib/format";
import { useDeleteFueling, useFuelings } from "@/hooks/use-tanque";
import { computeFuelings } from "@/services/analytics";
import { historyVerdicts } from "@/services/verdict";
import type { Fueling } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de abastecimentos — Tanque+" },
      {
        name: "description",
        content: "Seus abastecimentos com valor, preço por litro e se você economizou.",
      },
      { property: "og:title", content: "Histórico de abastecimentos — Tanque+" },
      {
        property: "og:description",
        content: "Toque em um abastecimento para ver litros, quilometragem e consumo.",
      },
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

  const rows = useMemo(
    () => computeFuelings((fuelings.data ?? []) as Fueling[]),
    [fuelings.data],
  );
  const verdicts = useMemo(() => historyVerdicts(rows), [rows]);

  return (
    <AppShell>
      <PageHeader title="Histórico" subtitle="Toque para ver os detalhes" />

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
            const verdict = verdicts.get(row.id);
            return (
              <li key={row.id}>
                <AppCard className="p-0">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : row.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <span className="w-12 shrink-0 text-[11px] font-semibold uppercase leading-tight text-muted-foreground">
                      {shortDate(row.filled_at).replace(".", "")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {brl(Number(row.total_cost))} · {brl(Number(row.price_per_liter))}/L
                      </span>
                      {verdict ? (
                        <span className="mt-1 block">
                          <VerdictPill verdict={verdict} />
                        </span>
                      ) : null}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="space-y-2 border-t border-border px-4 py-4 text-sm">
                      <Row label="Data" value={fullDate(row.filled_at)} />
                      <Row label="Combustível" value={FUEL_LABEL[row.fuel_type_id] ?? row.fuel_type_id} />
                      <Row label="Litros" value={`${num(Number(row.liters), 2)} L`} />
                      <Row label="Odômetro" value={`${num(Number(row.odometer), 0)} km`} />
                      <Row
                        label="Rodou desde o anterior"
                        value={row.distance ? `${num(row.distance, 0)} km` : "—"}
                      />
                      <Row label="Consumo" value={kmPerLiter(row.computed_km_per_liter)} />
                      <Row
                        label="Custo por km"
                        value={row.computed_cost_per_km ? brl(row.computed_cost_per_km) : "—"}
                      />
                      <Row label="Tanque cheio" value={row.full_tank ? "Sim" : "Não"} />
                      {verdict?.reference ? (
                        <p className="pt-1 text-xs text-muted-foreground">
                          Comparação feita com {verdict.reference}
                          {verdict.referencePrice ? ` (${brl(verdict.referencePrice)}/L)` : ""}.
                        </p>
                      ) : null}
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
