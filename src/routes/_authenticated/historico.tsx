import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
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
import { FUEL_LABEL, FUEL_TYPES } from "@/constants/app";
import { brl, fullDate, kmPerLiter, num, shortDate } from "@/lib/format";
import { useDeleteFueling, useFuelings, useUpdateFueling, useVehicles } from "@/hooks/use-tanque";
import { computeFuelings, validateOdometer, type FuelingComputed } from "@/services/analytics";
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

  const vehicles = useVehicles();
  const vehicleList = vehicles.data ?? [];
  const multi = vehicleList.length > 1;
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const vehicleName = (id: string) => {
    const v = vehicleList.find((x) => x.id === id);
    return v ? v.nickname || `${v.brand} ${v.model}` : "";
  };

  const allRows = useMemo(
    () => computeFuelings((fuelings.data ?? []) as Fueling[]),
    [fuelings.data],
  );
  const verdicts = useMemo(() => historyVerdicts(allRows), [allRows]);
  const rows = useMemo(
    () =>
      vehicleFilter === "all" ? allRows : allRows.filter((r) => r.vehicle_id === vehicleFilter),
    [allRows, vehicleFilter],
  );
  /** Agrupa por mês (mais recente primeiro) com o total gasto. */
  const months = useMemo(() => {
    const map = new Map<string, { label: string; total: number; items: FuelingComputed[] }>();
    for (const r of rows) {
      const d = new Date(r.filled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const g = map.get(key) ?? { label: monthLabel.format(d), total: 0, items: [] };
      g.total += Number(r.total_cost) || 0;
      g.items.push(r);
      map.set(key, g);
    }
    return [...map.values()];
  }, [rows]);

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
        <div className="space-y-5">
          {multi ? (
            <ChoiceGroup
              label="Veículo"
              value={vehicleFilter}
              onChange={setVehicleFilter}
              options={[
                { value: "all", label: "Todos" },
                ...vehicleList.map((v) => ({
                  value: v.id,
                  label: v.nickname || `${v.brand} ${v.model}`,
                })),
              ]}
            />
          ) : null}
          {months.map((month) => (
            <section key={month.label}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold capitalize text-foreground">{month.label}</h2>
                <span className="text-sm font-semibold text-foreground">{brl(month.total)}</span>
              </div>
              <ul className="space-y-3">
                {month.items.map((row) => {
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
                              {brl(Number(row.total_cost))} · {brl(Number(row.price_per_liter))}/
                              {unitOf(row.fuel_type_id)}
                            </span>
                            {multi ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {vehicleName(row.vehicle_id)}
                              </span>
                            ) : null}
                            {verdict ? (
                              <span className="mt-1 block">
                                <VerdictPill verdict={verdict} />
                              </span>
                            ) : null}
                          </span>
                        </button>

                        {expanded && editing === row.id ? (
                          <EditFueling
                            row={row}
                            siblings={allRows.filter((r) => r.vehicle_id === row.vehicle_id)}
                            onDone={() => setEditing(null)}
                          />
                        ) : expanded ? (
                          <div className="space-y-2 border-t border-border px-4 py-4 text-sm">
                            <Row label="Data" value={fullDate(row.filled_at)} />
                            <Row
                              label="Combustível"
                              value={FUEL_LABEL[row.fuel_type_id] ?? row.fuel_type_id}
                            />
                            <Row
                              label={unitOf(row.fuel_type_id) === "L" ? "Litros" : "Volume"}
                              value={`${num(Number(row.liters), 2)} ${unitOf(row.fuel_type_id)}`}
                            />
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
                                {verdict.referencePrice
                                  ? ` (${brl(verdict.referencePrice)}/L)`
                                  : ""}
                                .
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
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const unitOf = (fuel: string) => FUEL_TYPES.find((f) => f.id === fuel)?.unit ?? "L";

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
function EditFueling({
  row,
  siblings,
  onDone,
}: {
  row: FuelingComputed;
  siblings: FuelingComputed[];
  onDone: () => void;
}) {
  const update = useUpdateFueling();
  const [total, setTotal] = useState(Number(row.total_cost).toFixed(2).replace(".", ","));
  const [price, setPrice] = useState(Number(row.price_per_liter).toFixed(3).replace(".", ","));
  const [odometer, setOdometer] = useState(String(Math.round(Number(row.odometer))));
  const [date, setDate] = useState(toDateInput(row.filled_at));
  const [fullTank, setFullTank] = useState(row.full_tank);
  const [fuel, setFuel] = useState(row.fuel_type_id);
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
    // Mantém o horário original se a data não mudou.
    const filledAt =
      date === toDateInput(row.filled_at) ? new Date(row.filled_at) : new Date(`${date}T12:00:00`);
    if (Number.isNaN(filledAt.getTime())) {
      setError("Data inválida.");
      return;
    }
    if (date > toDateInput(new Date().toISOString())) {
      setError("A data não pode ser no futuro.");
      return;
    }
    const odometerError = validateOdometer(siblings, filledAt, odo, row.id);
    if (odometerError) {
      setError(odometerError);
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
          full_tank: fullTank,
          fuel_type_id: fuel,
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
      <ChoiceGroup
        label="Combustível"
        value={fuel}
        onChange={setFuel}
        options={FUEL_TYPES.map((f) => ({ value: f.id, label: f.short }))}
      />
      <ChoiceGroup
        label="Completou o tanque?"
        value={fullTank ? "sim" : "nao"}
        onChange={(v) => setFullTank(v === "sim")}
        options={[
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ]}
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
