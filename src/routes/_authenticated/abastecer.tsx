import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Fuel } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
  EmptyState,
  NumericField,
  PageHeader,
  parseDecimal,
  ScreenSkeleton,
  SelectField,
  TextField,
  VerdictCard,
} from "@/components/ds";
import { FUEL_TYPES } from "@/constants/app";
import { brl, kmPerLiter, num } from "@/lib/format";
import {
  useCreateFueling,
  useFuelings,
  useProfile,
  useStations,
  useVehicles,
} from "@/hooks/use-tanque";
import { computeFuelings } from "@/services/analytics";
import { deriveAmounts, priceVerdict } from "@/services/verdict";
import type { PriceVerdict } from "@/services/verdict";
import { fuelingSchema } from "@/validators";
import { captureException } from "@/lib/telemetry";
import type { Fueling } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/abastecer")({
  head: () => ({
    meta: [
      { title: "Registrar abastecimento — Tanque+" },
      {
        name: "description",
        content: "Informe o valor e o preço do litro: o Tanque+ calcula o resto e diz se foi bom.",
      },
      { property: "og:title", content: "Registrar abastecimento — Tanque+" },
      {
        property: "og:description",
        content: "Dois campos e pronto: litros, consumo e economia calculados para você.",
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
  price: number;
  kmPerLiter: number | null;
  verdict: PriceVerdict;
}

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Hoje = agora; data passada = 12:00 local daquele dia. */
const filledAtFor = (date: string) => {
  if (!date || date === todayLocal()) return new Date();
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

function AbastecerPage() {
  const vehicles = useVehicles();
  const fuelings = useFuelings();
  const profile = useProfile();
  const stations = useStations(profile.data?.city ?? null);
  const create = useCreateFueling();

  const list = vehicles.data ?? [];
  const history = useMemo(
    () => computeFuelings((fuelings.data ?? []) as Fueling[]),
    [fuelings.data],
  );

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const vehicle = list.find((v) => v.id === vehicleId) ?? list.find((v) => v.is_primary) ?? list[0];

  const [date, setDate] = useState(todayLocal());
  const filledAt = filledAtFor(date);

  /** Registros do veículo, mais recente primeiro. */
  const vehicleHistory = useMemo(
    () => (vehicle ? history.filter((r) => r.vehicle_id === vehicle.id) : []),
    [history, vehicle],
  );
  /** Último registro do veículo — base do preenchimento inteligente. */
  const lastForVehicle = vehicleHistory[0] ?? null;
  /** Vizinhos na linha do tempo da data escolhida. */
  const prevByDate =
    vehicleHistory.find((r) => new Date(r.filled_at).getTime() <= filledAt.getTime()) ?? null;
  const nextByDate =
    [...vehicleHistory]
      .reverse()
      .find((r) => new Date(r.filled_at).getTime() > filledAt.getTime()) ?? null;

  const [fuel, setFuel] = useState<string | null>(null);
  const fuelTypeId = fuel ?? lastForVehicle?.fuel_type_id ?? vehicle?.fuel_type_id ?? "gasolina";

  const suggestedPrice = lastForVehicle ? Number(lastForVehicle.price_per_liter) : null;
  const [total, setTotal] = useState("");
  const [price, setPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [litersInput, setLitersInput] = useState("");
  const [odometer, setOdometer] = useState("");
  const [stationId, setStationId] = useState<string>("");
  const [fullTank, setFullTank] = useState(true);

  /* O histórico chega depois do primeiro render: só então dá para sugerir o preço. */
  useEffect(() => {
    if (priceTouched || !suggestedPrice) return;
    setPrice(suggestedPrice.toFixed(2).replace(".", ","));
  }, [suggestedPrice, priceTouched]);
  const [details, setDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  const amounts = deriveAmounts({
    total: parseDecimal(total),
    price: parseDecimal(price),
    liters: parseDecimal(litersInput),
  });

  const previousOdometer = prevByDate ? Number(prevByDate.odometer) || null : null;
  const nextOdometer = nextByDate ? Number(nextByDate.odometer) || null : null;
  const odometerValue = odometer ? parseDecimal(odometer) : 0;

  /** Consumo do novo registro calculado com o histórico real (tanque cheio → tanque cheio). */
  const previewKml = useMemo(() => {
    if (!vehicle || !odometerValue || !(amounts.liters > 0)) return null;
    const draft = {
      ...(vehicleHistory[0] ?? {}),
      id: "__preview__",
      vehicle_id: vehicle.id,
      fuel_type_id: fuelTypeId,
      filled_at: filledAt.toISOString(),
      liters: amounts.liters,
      total_cost: amounts.total,
      price_per_liter: amounts.price,
      odometer: odometerValue,
      full_tank: fullTank,
    } as Fueling;
    const rows = computeFuelings([...(vehicleHistory as Fueling[]), draft]);
    const row = rows.find((r) => r.id === "__preview__");
    return row?.computed_km_per_liter
      ? { kmPerLiter: row.computed_km_per_liter, costPerKm: row.computed_cost_per_km }
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, vehicleHistory, odometerValue, amounts.liters, amounts.total, amounts.price, fullTank, fuelTypeId, date]);

  const canSubmit =
    amounts.total > 0 && amounts.price > 0 && amounts.liters > 0 && odometerValue > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle) return;
    setError(null);

    if (!canSubmit) {
      setError("Informe o valor, o preço por litro e a quilometragem atual.");
      return;
    }

    if (date > todayLocal()) {
      setError("A data não pode ser no futuro.");
      return;
    }

    if (previousOdometer && odometerValue <= previousOdometer) {
      setError(
        `A quilometragem precisa ser maior que a do registro anterior (${num(previousOdometer, 0)} km).`,
      );
      return;
    }

    if (nextOdometer && odometerValue >= nextOdometer) {
      setError(
        `A quilometragem precisa ser menor que a do registro seguinte (${num(nextOdometer, 0)} km).`,
      );
      return;
    }

    const parsed = fuelingSchema.safeParse({
      vehicle_id: vehicle.id,
      station_id: stationId || null,
      fuel_type_id: fuelTypeId,
      filled_at: filledAt.toISOString(),
      liters: Number(amounts.liters.toFixed(3)),
      price_per_liter: Number(amounts.price.toFixed(3)),
      total_cost: Number(amounts.total.toFixed(2)),
      odometer: odometerValue,
      full_tank: fullTank,
      note: "",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    try {
      await create.mutateAsync({
        draft: parsed.data,
        computed: {
          km_per_liter: previewKml?.kmPerLiter ?? null,
          cost_per_km: previewKml?.costPerKm ?? null,
        },
      });

      setSaved({
        liters: parsed.data.liters,
        total: parsed.data.total_cost,
        price: parsed.data.price_per_liter,
        kmPerLiter: previewKml?.kmPerLiter ?? null,
        verdict: priceVerdict(
          vehicleHistory.filter((r) => new Date(r.filled_at).getTime() < filledAt.getTime()),
          {
            pricePerLiter: parsed.data.price_per_liter,
            liters: parsed.data.liters,
            fuelTypeId,
            vehicleId: vehicle.id,
            at: filledAt,
          },
        ),
      });
    } catch (err) {
      captureException(err, { scope: "fueling.create" });
      setError("Não conseguimos salvar agora. Tente novamente em instantes.");
    }
  }

  if (vehicles.isLoading) {
    return (
      <AppShell fab={false}>
        <ScreenSkeleton cards={2} />
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
          description="Precisamos do veículo para calcular consumo e economia."
          action={
            <ActionLink to="/veiculo" size="md" className="mt-1">
              Cadastrar veículo
            </ActionLink>
          }
        />
      </AppShell>
    );
  }

  if (saved) {
    return (
      <AppShell fab={false}>
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Abastecimento registrado!
          </h1>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {brl(saved.total)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {num(saved.liters, 2)} L · {brl(saved.price)}/L
          </p>
        </div>

        <div className="space-y-3">
          <VerdictCard verdict={saved.verdict} />

          {saved.kmPerLiter ? (
            <AppCard className="p-4">
              <p className="text-sm text-muted-foreground">
                Seu carro fez{" "}
                <span className="font-semibold text-foreground">
                  {kmPerLiter(saved.kmPerLiter)}
                </span>{" "}
                desde o último tanque cheio.
              </p>
            </AppCard>
          ) : (
            <AppCard className="p-4">
              <p className="text-sm text-muted-foreground">
                No próximo abastecimento, complete o tanque e informe o km para ver seu consumo
                real.
              </p>
            </AppCard>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <ActionLink to="/app">Voltar para o início</ActionLink>
          <ActionLink to="/historico" variant="secondary">
            Ver detalhes no histórico
          </ActionLink>
          <Action
            variant="ghost"
            onClick={() => {
              setSaved(null);
              setTotal("");
              setLitersInput("");
              setOdometer("");
              setDate(todayLocal());
            }}
          >
            Registrar outro
          </Action>
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
        <ChoiceGroup
          label="Combustível"
          value={fuelTypeId}
          onChange={setFuel}
          options={FUEL_TYPES.map((f) => ({ value: f.id, label: f.short }))}
        />

        <NumericField
          label="Quanto você abasteceu"
          value={total}
          onChange={setTotal}
          prefix="R$"
          autoFocus
        />

        <NumericField
          label="Preço por litro"
          value={price}
          onChange={(value) => {
            setPriceTouched(true);
            setPrice(value);
          }}
          prefix="R$"
          suffix="/L"
          hint={
            amounts.liters > 0
              ? `Dá ${num(amounts.liters, 2)} litros`
              : suggestedPrice
                ? "Preenchemos com o preço do último abastecimento"
                : "Com o valor, calculamos os litros para você"
          }
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
              : "Odômetro do painel do carro"
          }
        />

        <ChoiceGroup
          label="Completou o tanque?"
          value={fullTank ? "sim" : "nao"}
          onChange={(value) => setFullTank(value === "sim")}
          options={[
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" },
          ]}
        />

        {list.length > 1 ? (
          <ChoiceGroup
            label="Veículo"
            value={vehicle.id}
            onChange={setVehicleId}
            options={list.map((v) => ({
              value: v.id,
              label: v.nickname || `${v.brand} ${v.model}`,
            }))}
          />
        ) : null}

        <button
          type="button"
          onClick={() => setDetails((v) => !v)}
          aria-expanded={details}
          className="flex min-h-11 w-full items-center justify-between text-sm font-semibold text-primary"
        >
          Ver detalhes (opcional)
          <ChevronDown className={`h-4 w-4 transition-transform ${details ? "rotate-180" : ""}`} />
        </button>

        {details ? (
          <div className="space-y-5 rounded-3xl border border-border bg-card/60 p-4">
            <TextField
              label="Data do abastecimento"
              type="date"
              value={date}
              max={todayLocal()}
              onChange={(event) => setDate(event.target.value || todayLocal())}
            />

            <NumericField
              label="Litros abastecidos"
              value={litersInput}
              onChange={setLitersInput}
              suffix="L"
              hint="Só se você preferir informar os litros no lugar do preço."
            />

            {(stations.data ?? []).length > 0 ? (
              <SelectField
                label="Posto"
                value={stationId}
                onChange={(event) => setStationId(event.target.value)}
                options={[
                  { value: "", label: "Não informar" },
                  ...(stations.data ?? []).map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            ) : null}
          </div>
        ) : null}

        {previewKml ? (
          <p className="text-sm text-muted-foreground">
            Seu carro fez {kmPerLiter(previewKml.kmPerLiter)} nesse trecho.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Action type="submit" loading={create.isPending} disabled={!canSubmit}>
          {create.isPending ? null : <Fuel className="h-5 w-5" />}
          Registrar abastecimento
        </Action>
      </form>
    </AppShell>
  );
}
