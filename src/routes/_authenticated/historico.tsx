import { createFileRoute } from "@tanstack/react-router";
import { vehicleName as displayVehicleName } from "@/constants/vehicles";
import { useMemo, useState } from "react";
import { AlertTriangle, Download, Pencil, Trash2 } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
  ConfirmAction,
  EmptyState,
  ErrorState,
  formatCents,
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
import {
  computeFuelings,
  validateOdometer,
  type FuelingComputed,
  type FuelingIssue,
} from "@/services/analytics";
import { fuelingsToCsv, saveCsv } from "@/lib/csv";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
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
    return v ? displayVehicleName(v) : "";
  };

  const allRows = useMemo(
    () => computeFuelings((fuelings.data ?? []) as Fueling[], vehicleList),
    [fuelings.data, vehicleList],
  );
  const verdicts = useMemo(() => historyVerdicts(allRows), [allRows]);
  const [period, setPeriod] = useState<PeriodId>("all");
  const rows = useMemo(() => {
    const since = periodStart(period);
    return allRows.filter(
      (r) =>
        (vehicleFilter === "all" || r.vehicle_id === vehicleFilter) &&
        (!since || new Date(r.filled_at) >= since),
    );
  }, [allRows, vehicleFilter, period]);
  /** Totais do filtro atual, sem os registros duplicados (os mesmos números do Painel). */
  const totals = useMemo(() => {
    const counted = rows.filter((r) => r.issue !== "duplicate");
    return {
      count: counted.length,
      spend: counted.reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
      liters: counted.reduce((s, r) => s + (Number(r.liters) || 0), 0),
    };
  }, [rows]);

  async function exportCsv() {
    const csv = fuelingsToCsv(rows, vehicleName);
    const stamp = new Date().toISOString().slice(0, 10);
    const result = await saveCsv(csv, `tanque-abastecimentos-${stamp}.csv`);
    if (result === "cancelled") return;
    track("export_csv", { rows: rows.length, period, via: result });
    toast.success(
      result === "downloaded"
        ? "Planilha baixada (CSV). Abra no Excel ou no Google Planilhas."
        : "Planilha pronta (CSV). Abra no Excel ou no Google Planilhas.",
      { description: "No computador fica mais confortável para analisar." },
    );
  }
  /** Agrupa por mês (mais recente primeiro) com o total gasto. */
  const months = useMemo(() => {
    const map = new Map<string, { label: string; total: number; items: FuelingComputed[] }>();
    for (const r of rows) {
      const d = new Date(r.filled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const g = map.get(key) ?? {
        label: capitalizeFirst(monthLabel.format(d)),
        total: 0,
        items: [],
      };
      if (r.issue !== "duplicate") g.total += Number(r.total_cost) || 0;
      g.items.push(r);
      map.set(key, g);
    }
    return [...map.values()];
  }, [rows]);

  return (
    <AppShell>
      <PageHeader title="Histórico" subtitle="Filtre por período, confira e exporte" />

      {fuelings.isLoading ? (
        <ScreenSkeleton cards={3} />
      ) : fuelings.isError ? (
        <ErrorState
          title="Não conseguimos carregar seu histórico"
          onRetry={() => void fuelings.refetch()}
        />
      ) : allRows.length === 0 ? (
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
                  label: displayVehicleName(v),
                })),
              ]}
            />
          ) : null}
          <ChoiceGroup
            label="Período"
            value={period}
            onChange={(value) => setPeriod(value as PeriodId)}
            options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
          />
          <AppCard className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-foreground">
                {brl(totals.spend)} em {totals.count}{" "}
                {totals.count === 1 ? "abastecimento" : "abastecimentos"}
              </p>
              <p className="text-xs text-muted-foreground">
                {num(totals.liters, 1)} L · {PERIODS.find((p) => p.id === period)?.label}
              </p>
            </div>
            <Action
              variant="secondary"
              size="sm"
              onClick={exportCsv}
              disabled={rows.length === 0}
              aria-label="Baixar planilha deste período (CSV, abre no Excel)"
            >
              <Download className="h-4 w-4" /> Planilha
            </Action>
          </AppCard>
          <p className="-mt-3 px-1 text-xs text-muted-foreground">
            A planilha sai em CSV, com os filtros acima. Abre no Excel, no Google Planilhas e no
            Numbers.
          </p>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum abastecimento neste período.
            </p>
          ) : null}
          {months.map((month) => (
            <section key={month.label}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-foreground">{month.label}</h2>
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
                            {row.issue ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-destructive/30 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                <AlertTriangle className="h-3 w-3" /> {ISSUE_SHORT[row.issue]}
                              </span>
                            ) : verdict ? (
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
                            <Row
                              label="Consumo"
                              value={kmPerLiter(
                                row.computed_km_per_liter ?? row.outlier_km_per_liter,
                              )}
                            />
                            {row.issue ? (
                              <p className="rounded-2xl bg-muted px-3 py-2 text-xs text-foreground">
                                {ISSUE_HELP[row.issue]}
                              </p>
                            ) : null}
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

/** "outubro de 2026" → "Outubro de 2026" (o CSS capitalize deixaria "De"). */
const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const PERIODS = [
  { id: "month", label: "Este mês" },
  { id: "3m", label: "3 meses" },
  { id: "12m", label: "12 meses" },
  { id: "all", label: "Tudo" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

/** Início do período (meses de calendário, horário local); null = sem limite. */
function periodStart(period: PeriodId, now = new Date()): Date | null {
  if (period === "all") return null;
  const back = period === "month" ? 0 : period === "3m" ? 2 : 11;
  return new Date(now.getFullYear(), now.getMonth() - back, 1);
}

const ISSUE_SHORT: Record<FuelingIssue, string> = {
  duplicate: "Possível duplicado",
  odometer: "Km inconsistente",
  outlier: "Consumo fora do padrão",
};

const ISSUE_HELP: Record<FuelingIssue, string> = {
  duplicate:
    "Mesmo km, litros e valor do registro anterior. Ele ficou fora do gasto e do consumo. Se foi registrado duas vezes por engano, exclua este.",
  odometer:
    "O km é menor ou igual ao do registro anterior. Os litros contam, mas o km não é usado para medir consumo. Corrija se foi erro de digitação.",
  outlier:
    "Consumo muito diferente do seu padrão — geralmente um abastecimento não registrado ou um tanque que não foi completado. Este trecho não entra nas médias.",
};
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
  const [total, setTotal] = useState(formatCents(Number(row.total_cost), 2));
  const [price, setPrice] = useState(formatCents(Number(row.price_per_liter), 2));
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
      <NumericField label="Valor pago" value={total} onChange={setTotal} prefix="R$" cents={2} />
      <NumericField
        label="Preço por litro"
        value={price}
        onChange={setPrice}
        prefix="R$"
        suffix="/L"
        cents={2}
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
