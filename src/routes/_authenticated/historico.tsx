import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ConfirmAction,
  EmptyState,
  ErrorState,
  NumericField,
  PageHeader,
  parseDecimal,
  ScreenSkeleton,
  TextField,
  VerdictPill,
} from "@/components/ds";
import { FUEL_LABEL } from "@/constants/app";
import { brl, fullDate, kmPerLiter, num, shortDate } from "@/lib/format";
import { useDeleteFueling, useFuelings, useUpdateFueling } from "@/hooks/use-tanque";
import { computeFuelings, type FuelingComputed } from "@/services/analytics";
import { deriveAmounts, historyVerdicts } from "@/services/verdict";
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
  const [editing, setEditing] = useState<string | null>(null);

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
      ) : fuelings.isError ? (
        <ErrorState
          title="Não conseguimos carregar seu histórico"
          onRetry={() => void fuelings.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Seu histórico começa aqui."
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

                  {expanded && editing === row.id ? (
                    <EditFueling row={row} onDone={() => setEditing(null)} />
                  ) : expanded ? (
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
                      <div className="flex items-center gap-2 pt-2">
                        <Action
                          variant="ghost"
                          size="sm"
                          className="px-0"
                          onClick={() => setEditing(row.id)}
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Action>
                        <ConfirmAction
                          title="Excluir abastecimento?"
                          description="Esse registro sai do histórico e das estatísticas de consumo."
                          onConfirm={() => remove.mutate(row.id)}
                          trigger={
                            <Action variant="danger-ghost" size="sm" className="ml-auto">
                              <Trash2 className="h-4 w-4" /> Excluir
                            </Action>
                          }
                        />
                      </div>
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

function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Correção de um abastecimento já registrado. Recalcula litros e consumo. */
function EditFueling({ row, onDone }: { row: FuelingComputed; onDone: () => void }) {
  const update = useUpdateFueling();
  const [total, setTotal] = useState(Number(row.total_cost).toFixed(2).replace(".", ","));
  const [price, setPrice] = useState(Number(row.price_per_liter).toFixed(3).replace(".", ","));
  const [odometer, setOdometer] = useState(String(Math.round(Number(row.odometer))));
  const [date, setDate] = useState(toDateInput(row.filled_at));
  const [error, setError] = useState<string | null>(null);

  const amounts = deriveAmounts({
    total: parseDecimal(total),
    price: parseDecimal(price),
    liters: 0,
  });

  async function save() {
    setError(null);
    const odo = parseDecimal(odometer);
    if (!(amounts.total > 0) || !(amounts.price > 0)) {
      setError("Informe o valor pago e o preço por litro.");
      return;
    }
    if (!(odo >= 0)) {
      setError("Quilometragem inválida.");
      return;
    }
    const filledAt = new Date(`${date}T12:00:00`);
    if (Number.isNaN(filledAt.getTime())) {
      setError("Data inválida.");
      return;
    }
    try {
      await update.mutateAsync({
        id: row.id,
        patch: {
          total_cost: Number(amounts.total.toFixed(2)),
          price_per_liter: Number(amounts.price.toFixed(3)),
          liters: Number(amounts.liters.toFixed(3)),
          odometer: odo,
          filled_at: filledAt.toISOString(),
          // recalculados a partir do odômetro dos registros vizinhos
          km_per_liter: null,
          cost_per_km: null,
        },
      });
      onDone();
    } catch {
      setError("Não conseguimos salvar agora. Tente novamente.");
    }
  }

  return (
    <div className="space-y-4 border-t border-border px-4 py-4">
      <NumericField label="Valor pago" value={total} onChange={setTotal} prefix="R$" />
      <NumericField
        label="Preço por litro"
        value={price}
        onChange={setPrice}
        prefix="R$"
        suffix="/L"
        hint={amounts.liters > 0 ? `Dá ${num(amounts.liters, 2)} litros` : undefined}
      />
      <NumericField
        label="Quilometragem"
        value={odometer}
        onChange={setOdometer}
        inputMode="numeric"
        suffix="km"
      />
      <TextField
        label="Data"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Action size="md" loading={update.isPending} onClick={save}>
          Salvar alterações
        </Action>
        <Action variant="ghost" size="md" onClick={onDone}>
          Cancelar
        </Action>
      </div>
    </div>
  );
}
