import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Fuel, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { AppCard, EmptyState, PageHeader, ScreenSkeleton } from "@/components/app/Surface";
import { NumericField, parseDecimal } from "@/components/app/NumericField";
import { FUEL_TYPES } from "@/constants/app";
import { brl, kmPerLiter, liters as fmtLiters, num } from "@/lib/format";
import { useCreateFueling, useFuelings, useVehicles } from "@/hooks/use-tanque";
import { computeFuelings, estimateConsumption } from "@/services/analytics";
import { fuelingSchema } from "@/validators";
import type { Fueling } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/abastecer")({
  head: () => ({
    meta: [
      { title: "Registrar abastecimento — Tanque+" },
      {
        name: "description",
        content:
          "Registre valor pago, preço do litro e quilometragem: o Tanque+ calcula litros, consumo e custo por km.",
      },
      { property: "og:title", content: "Registrar abastecimento — Tanque+" },
      {
        property: "og:description",
        content: "Cálculo automático de litros, consumo e custo por km em menos de 20 segundos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbastecerPage,
});

interface Saved {
  liters: number;
  total: number;
  kmPerLiter: number | null;
  costPerKm: number | null;
}

function AbastecerPage() {
  const navigate = useNavigate();
  const vehicles = useVehicles();
  const fuelings = useFuelings();
  const create = useCreateFueling();

  const list = vehicles.data ?? [];
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const vehicle = list.find((v) => v.id === vehicleId) ?? list.find((v) => v.is_primary) ?? list[0];

  const [fuel, setFuel] = useState<string | null>(null);
  const fuelTypeId = fuel ?? vehicle?.fuel_type_id ?? "gasolina";

  const [total, setTotal] = useState("");
  const [price, setPrice] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  const totalValue = parseDecimal(total);
  const priceValue = parseDecimal(price);
  const odometerValue = parseDecimal(odometer);
  const litersValue = priceValue > 0 ? totalValue / priceValue : 0;

  const previousOdometer = useMemo(() => {
    if (!vehicle) return null;
    const rows = computeFuelings((fuelings.data ?? []) as Fueling[]).filter(
      (r) => r.vehicle_id === vehicle.id,
    );
    return rows.length ? Number(rows[0].odometer) : Number(vehicle.current_odometer) || null;
  }, [fuelings.data, vehicle]);

  const preview = estimateConsumption(previousOdometer, odometerValue, litersValue, totalValue);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle) return;
    setError(null);

    const parsed = fuelingSchema.safeParse({
      vehicle_id: vehicle.id,
      station_id: null,
      fuel_type_id: fuelTypeId,
      filled_at: new Date().toISOString(),
      liters: Number(litersValue.toFixed(3)),
      price_per_liter: priceValue,
      total_cost: totalValue,
      odometer: odometerValue,
      full_tank: fullTank,
      note: "",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    await create.mutateAsync({
      draft: parsed.data,
      computed: { km_per_liter: preview.kmPerLiter, cost_per_km: preview.costPerKm },
    });

    setSaved({
      liters: parsed.data.liters,
      total: parsed.data.total_cost,
      kmPerLiter: preview.kmPerLiter,
      costPerKm: preview.costPerKm,
    });
  }

  if (vehicles.isLoading) {
    return (
      <AppShell fab={false}>
        <ScreenSkeleton cards={3} />
      </AppShell>
    );
  }

  if (!vehicle) {
    return (
      <AppShell fab={false}>
        <PageHeader title="Abastecer" />
        <EmptyState
          emoji="🚗"
          title="Cadastre um veículo primeiro"
          description="Precisamos do veículo para calcular consumo, custo por km e economia."
          action={
            <Link
              to="/veiculo"
              className="mt-1 flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Cadastrar veículo
            </Link>
          }
        />
      </AppShell>
    );
  }

  if (saved) {
    return (
      <AppShell fab={false}>
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Abastecimento registrado
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtLiters(saved.liters)} · {brl(saved.total)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AppCard className="p-4">
            <p className="text-xs text-muted-foreground">Consumo</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {kmPerLiter(saved.kmPerLiter)}
            </p>
          </AppCard>
          <AppCard className="p-4">
            <p className="text-xs text-muted-foreground">Custo por km</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {saved.costPerKm ? brl(saved.costPerKm) : "—"}
            </p>
          </AppCard>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/app" })}
            className="min-h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Voltar para o início
          </button>
          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setTotal("");
              setPrice("");
              setOdometer("");
            }}
            className="min-h-14 w-full rounded-2xl border border-border bg-card text-base font-semibold text-foreground"
          >
            Registrar outro
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell fab={false}>
      <PageHeader
        title="Abastecer"
        subtitle={vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}
      />

      <form onSubmit={submit} className="space-y-5">
        {list.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicleId(v.id)}
                className={`min-h-11 shrink-0 rounded-2xl border px-4 text-sm font-medium transition-colors ${
                  v.id === vehicle.id
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {v.nickname || `${v.brand} ${v.model}`}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {FUEL_TYPES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFuel(f.id)}
              aria-pressed={fuelTypeId === f.id}
              className={`min-h-11 rounded-2xl border px-4 text-sm font-medium transition-colors ${
                fuelTypeId === f.id
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {f.short}
            </button>
          ))}
        </div>

        <NumericField
          label="Valor abastecido"
          value={total}
          onChange={setTotal}
          prefix="R$"
          autoFocus
        />
        <NumericField
          label="Preço por litro"
          value={price}
          onChange={setPrice}
          prefix="R$"
          suffix="/L"
          hint={litersValue > 0 ? `${num(litersValue, 2)} litros` : "Calculamos os litros para você"}
        />
        <NumericField
          label="Quilometragem atual"
          value={odometer}
          onChange={setOdometer}
          inputMode="numeric"
          suffix="km"
          hint={
            previousOdometer
              ? `Último registro: ${num(previousOdometer, 0)} km`
              : "Odômetro do painel"
          }
        />

        <label className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-4">
          <span className="text-sm font-medium text-foreground">Enchi o tanque</span>
          <input
            type="checkbox"
            checked={fullTank}
            onChange={(e) => setFullTank(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>

        {preview.kmPerLiter ? (
          <AppCard className="border-primary/25 bg-accent/40 p-4">
            <p className="text-xs text-muted-foreground">Prévia deste abastecimento</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {num(preview.distance ?? 0, 0)} km rodados · {kmPerLiter(preview.kmPerLiter)} ·{" "}
              {brl(preview.costPerKm ?? 0)}/km
            </p>
          </AppCard>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={create.isPending}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {create.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Fuel className="h-5 w-5" />
          )}
          Salvar abastecimento
        </button>
      </form>
    </AppShell>
  );
}
