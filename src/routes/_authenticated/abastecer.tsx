import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { CheckCircle2, ChevronDown, Fuel, Share2, ShieldAlert } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
  EmptyState,
  formatCents,
  maskInteger,
  NumericField,
  PageHeader,
  parseDecimal,
  PrimaryStar,
  ScreenSkeleton,
  TeoSays,
  TextField,
  VerdictCard,
} from "@/components/ds";
import { FUEL_TYPES } from "@/constants/app";
import { brl, kmPerLiter, num } from "@/lib/format";
import {
  useCreateFueling,
  useFuelings,
  usePriceReferences,
  useProfile,
  useSetPrimaryVehicle,
  useVehicles,
} from "@/hooks/use-tanque";
import {
  computeFuelings,
  consumptionPendingText,
  fullTanksMissing,
  validateOdometer,
  odometerJump,
  odometerJumpText,
} from "@/services/analytics";
import { vehicleWords, vehicleName, fuelsFor, vehicleKind } from "@/constants/vehicles";
import { shareCard } from "@/lib/share-image";
import { Confetti, haptic } from "@/components/app/Confetti";
import { InviteButton } from "@/components/app/InviteButton";
import { deriveAmounts, priceVerdict } from "@/services/verdict";
import type { PriceVerdict } from "@/services/verdict";
import {
  chooseReference,
  referenceFuelName,
  weekLabel,
  type ChosenReference,
} from "@/services/anp";
import { fuelingSchema } from "@/validators";
import { recentStations } from "@/services/best-price";
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

/** Valores redondos mais comuns na bomba. */
/** Valores mais comuns: moto abastece pouco por vez (entregador, quase todo dia). */
const QUICK_AMOUNTS = { carro: [30, 50, 70, 100], moto: [10, 15, 20, 30] } as const;

interface Saved {
  liters: number;
  total: number;
  price: number;
  kmPerLiter: number | null;
  atypical: boolean;
  verdict: PriceVerdict;
  unit: string;
  queued: boolean;
  tanksMissing: 1 | 2;
  /** Marco que merece o Teo: primeiro registro ou primeira medição de consumo. */
  milestone: "first-fueling" | "first-consumption" | null;
  /** Média da ANP na cidade (ou estado) para o mesmo combustível e semana. */
  cityRef: ChosenReference | null;
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
  const place = { uf: profile.data?.state ?? null, city: profile.data?.city ?? null };
  const references = usePriceReferences(place);
  const create = useCreateFueling();
  const setPrimary = useSetPrimaryVehicle();

  const list = vehicles.data ?? [];
  const history = useMemo(
    () => computeFuelings((fuelings.data ?? []) as Fueling[], list),
    [fuelings.data, list],
  );

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const vehicle = list.find((v) => v.id === vehicleId) ?? list.find((v) => v.is_primary) ?? list[0];
  const words = vehicleWords(vehicle?.brand);
  const quickAmounts: readonly number[] =
    words.kind === "moto" ? QUICK_AMOUNTS.moto : QUICK_AMOUNTS.carro;

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
  const [litersInput, setLitersInput] = useState("");
  /** null = a pessoa não mexeu no campo: vale o km sugerido (se houver). */
  const [odometerInput, setOdometer] = useState<string | null>(null);
  /**
   * Começa sempre em "Não": marcar tanque cheio sem ter enchido estraga a medição do consumo.
   * Quem completou escolhe "Sim" de propósito.
   */
  const [fullTank, setFullTank] = useState(false);
  const [station, setStation] = useState("");
  const myStations = useMemo(
    () => recentStations((fuelings.data ?? []) as Fueling[], 3),
    [fuelings.data],
  );

  const unit = FUEL_TYPES.find((f) => f.id === fuelTypeId)?.unit ?? "L";
  const [details, setDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    track("fueling_form_opened");
  }, []);
  /** km confirmado pela pessoa depois do aviso de salto improvável. */
  const [jumpConfirmed, setJumpConfirmed] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  const amounts = deriveAmounts({
    total: parseDecimal(total),
    price: parseDecimal(price),
    liters: parseDecimal(litersInput),
  });

  const previousOdometer = prevByDate ? Number(prevByDate.odometer) || null : null;
  const nextOdometer = nextByDate ? Number(nextByDate.odometer) || null : null;
  /**
   * Primeiro abastecimento do veículo: o km informado no cadastro já vem preenchido
   * (editável). Nos seguintes o campo vem vazio, porque o km muda a cada abastecimento.
   */
  const registeredOdometer =
    fuelings.isSuccess && vehicleHistory.length === 0
      ? Math.round(Number(vehicle?.current_odometer) || 0)
      : 0;
  const odometer =
    odometerInput ?? (registeredOdometer > 0 ? maskInteger(String(registeredOdometer)) : "");
  const odometerFromRegistration = odometerInput === null && registeredOdometer > 0;
  const odometerValue = odometer ? parseDecimal(odometer) : 0;
  const jump =
    vehicle && odometerValue > 0 ? odometerJump(vehicleHistory, filledAt, odometerValue) : null;
  const jumpPending = !!jump && jumpConfirmed !== odometerValue;

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
    const rows = computeFuelings([...(vehicleHistory as Fueling[]), draft], list);
    const row = rows.find((r) => r.id === "__preview__");
    if (row?.computed_km_per_liter) {
      return {
        kmPerLiter: row.computed_km_per_liter,
        costPerKm: row.computed_cost_per_km,
        atypical: false,
      };
    }
    // Consumo muito fora do padrão: mostramos, mas avisamos e ele não entra nas médias.
    return row?.outlier_km_per_liter
      ? { kmPerLiter: row.outlier_km_per_liter, costPerKm: null, atypical: true }
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehicle,
    vehicleHistory,
    odometerValue,
    amounts.liters,
    amounts.total,
    amounts.price,
    fullTank,
    fuelTypeId,
    date,
  ]);

  const canSubmit =
    amounts.total > 0 && amounts.price > 0 && amounts.liters > 0 && odometerValue > 0;

  /** Mensuração: por que o envio foi recusado (só o motivo, nunca valores). */
  const formError = (reason: string) => track("fueling_form_error", { reason });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle) return;
    setError(null);

    if (!canSubmit) {
      formError("campos_faltando");
      setError("Informe o valor, o preço por litro e a quilometragem atual.");
      return;
    }

    if (date > todayLocal()) {
      formError("data_futura");
      setError("A data não pode ser no futuro.");
      return;
    }

    const odometerError = validateOdometer(vehicleHistory, filledAt, odometerValue);
    if (odometerError) {
      formError(
        odometerError.includes("maior") ? "km_menor_que_anterior" : "km_maior_que_seguinte",
      );
      setError(odometerError);
      return;
    }
    if (jumpPending) {
      formError("salto_de_km_nao_confirmado");
      setError('Confira o km acima: corrija ou toque em "O km está certo".');
      return;
    }

    const parsed = fuelingSchema.safeParse({
      id: crypto.randomUUID(),
      vehicle_id: vehicle.id,
      // Sem base de postos confiável no beta (a tabela antiga tem exemplos do protótipo).
      station_id: null,
      station_name: station.trim(),
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
      formError("dados_invalidos");
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    try {
      const result = await create.mutateAsync({
        draft: parsed.data,
        computed: {
          km_per_liter: previewKml?.kmPerLiter ?? null,
          cost_per_km: previewKml?.costPerKm ?? null,
        },
      });

      haptic(20);
      setSaved({
        liters: parsed.data.liters,
        total: parsed.data.total_cost,
        price: parsed.data.price_per_liter,
        kmPerLiter: previewKml?.kmPerLiter ?? null,
        atypical: previewKml?.atypical ?? false,
        unit,
        queued: result.queued,
        milestone:
          vehicleHistory.length === 0
            ? "first-fueling"
            : previewKml &&
                !previewKml.atypical &&
                !vehicleHistory.some((r) => r.computed_km_per_liter)
              ? "first-consumption"
              : null,
        cityRef: references.data
          ? chooseReference(references.data, place, fuelTypeId, filledAt)
          : null,
        tanksMissing: fullTanksMissing([
          ...vehicleHistory,
          { full_tank: parsed.data.full_tank, odometer: parsed.data.odometer },
        ]),
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
      formError("falha_ao_salvar");
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
            <ActionLink to="/boas-vindas" size="md" className="mt-1">
              Cadastrar veículo
            </ActionLink>
          }
        />
      </AppShell>
    );
  }

  if (saved) {
    // Conquista: primeiro registro, primeira medição ou preço abaixo do habitual/da cidade.
    const celebrate =
      !saved.queued &&
      (!!saved.milestone ||
        saved.verdict.tone === "good" ||
        (!!saved.cityRef && saved.price < saved.cityRef.avgPrice - 0.005));
    return (
      <AppShell fab={false}>
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {saved.queued ? "Salvo no aparelho" : "Abastecimento registrado!"}
          </h1>
          {saved.queued ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Você está sem conexão. Enviaremos automaticamente quando a internet voltar.
            </p>
          ) : null}
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {brl(saved.total)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {num(saved.liters, 2)} {saved.unit} · {brl(saved.price)}/{saved.unit}
          </p>
        </div>

        <div className="space-y-3">
          {saved.milestone === "first-fueling" ? (
            <TeoSays spot="milestone-first-fueling" mood="cheer" title="Primeiro registro feito!">
              Daqui pra frente eu acompanho tudo.{" "}
              {saved.tanksMissing === 1
                ? `No próximo tanque cheio, já te mostro quantos km/L ${words.your} faz de verdade.`
                : `Com dois tanques cheios seguidos, te mostro quantos km/L ${words.your} faz de verdade.`}
            </TeoSays>
          ) : saved.milestone === "first-consumption" && saved.kmPerLiter ? (
            <TeoSays
              spot="milestone-first-consumption"
              mood="cheer"
              title="Sua primeira medição real!"
            >
              Entre os dois tanques cheios, {words.your} fez {kmPerLiter(saved.kmPerLiter)}. A cada
              tanque completo, essa média fica mais precisa.
            </TeoSays>
          ) : null}
          {saved.milestone === "first-consumption" && saved.kmPerLiter ? (
            <Action
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() =>
                void shareCard(
                  {
                    theme: "lima",
                    eyebrow: "Consumo real, medido por mim",
                    big: kmPerLiter(saved.kmPerLiter),
                    title: `${vehicleKind(vehicle.brand) === "moto" ? "Minha" : "Meu"} ${vehicle.nickname || vehicle.model} faz isso de verdade`,
                    caption: "Medido entre dois tanques cheios, não pelo manual.",
                  },
                  "primeiro-consumo",
                ).catch(() => undefined)
              }
            >
              <Share2 className="h-4 w-4" /> Compartilhar meu consumo
            </Action>
          ) : null}

          {saved.queued ? null : saved.verdict.tone === "neutral" && saved.cityRef ? (
            // Sem histórico para comparar com o habitual: a média da cidade já dá valor
            // desde o primeiro abastecimento.
            <CityPriceCard reference={saved.cityRef} paid={saved.price} />
          ) : (
            <VerdictCard verdict={saved.verdict} />
          )}
          {!saved.queued && !place.city ? (
            <ActionLink to="/perfil" variant="secondary" size="md" className="w-full">
              Informe sua cidade e compare com a média da ANP
            </ActionLink>
          ) : null}

          {saved.milestone ? null : saved.kmPerLiter ? (
            <AppCard className="p-4">
              <p className="text-sm text-muted-foreground">
                {words.Your} fez{" "}
                <span className="font-semibold text-foreground">
                  {kmPerLiter(saved.kmPerLiter)}
                </span>{" "}
                desde o último tanque cheio.
              </p>
              {saved.atypical ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Bem fora do esperado: fica fora das médias.
                </p>
              ) : null}
            </AppCard>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">
              {consumptionPendingText(saved.tanksMissing)}.
            </p>
          )}
        </div>

        {celebrate ? (
          <>
            <Confetti />
            <div className="mt-3">
              <InviteButton
                source="pos-abastecimento"
                variant="ghost"
                label="Contar para um amigo"
              />
            </div>
          </>
        ) : null}

        <div className="mt-6 space-y-2">
          <ActionLink to="/app">Pronto</ActionLink>
          <div className="flex gap-2">
            <ActionLink to="/historico" variant="ghost" size="md" className="flex-1">
              Ver no histórico
            </ActionLink>
            <Action
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => {
                setSaved(null);
                setTotal("");
                setLitersInput("");
                setOdometer(null);
                setFullTank(false);
                setDate(todayLocal());
              }}
            >
              Registrar outro
            </Action>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell fab={false}>
      <PageHeader title="Abastecer" subtitle={vehicleName(vehicle)} />

      <p className="-mt-3 mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Só com {words.the} {words.parked}, nunca {words.driving}.
      </p>

      <form onSubmit={submit} className="space-y-5">
        {list.length > 1 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Qual veículo?</p>
            <ChoiceGroup
              label="Veículo"
              value={vehicle.id}
              onChange={setVehicleId}
              options={list.map((v) => ({
                value: v.id,
                label: `${v.is_primary ? "★ " : ""}${vehicleName(v)}`,
              }))}
            />
            <PrimaryStar
              withLabel
              active={vehicle.is_primary}
              disabled={setPrimary.isPending}
              onClick={() => setPrimary.mutate(vehicle.id)}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Combustível</p>
          <ChoiceGroup
            label="Combustível"
            value={fuelTypeId}
            onChange={setFuel}
            options={fuelsFor(vehicle.brand, FUEL_TYPES).map((f) => ({
              value: f.id,
              label: f.short,
            }))}
          />
        </div>

        <div className="space-y-2">
          <NumericField
            label="Quanto você abasteceu"
            value={total}
            onChange={setTotal}
            prefix="R$"
            cents={2}
            autoFocus
          />
          <ChoiceGroup
            label="Valores rápidos"
            fill
            className="grid grid-cols-4"
            value={quickAmounts.includes(parseDecimal(total)) ? String(parseDecimal(total)) : ""}
            onChange={(value) => {
              setTotal(formatCents(Number(value)));
            }}
            options={quickAmounts.map((v) => ({ value: String(v), label: `R$ ${v}` }))}
          />
        </div>

        <NumericField
          label="Preço por litro"
          value={price}
          onChange={(value) => {
            setPrice(value);
          }}
          prefix="R$"
          suffix={`/${unit}`}
          cents={2}
          hint={
            amounts.liters > 0
              ? `Dá ${num(amounts.liters, 2)} ${unit === "L" ? "litros" : unit}`
              : undefined
          }
        />

        {suggestedPrice ? (
          <button
            type="button"
            onClick={() => setPrice(formatCents(suggestedPrice, 2))}
            className="-mt-2 min-h-11 text-sm font-semibold text-primary"
          >
            Mesmo do último: {brl(suggestedPrice)}/{unit}
          </button>
        ) : null}

        <NumericField
          label="Quilometragem atual"
          value={odometer}
          onChange={setOdometer}
          inputMode="numeric"
          suffix="km"
          hint={
            odometerFromRegistration
              ? "Do cadastro do veículo. Se rodou desde então, ajuste para o km do painel."
              : previousOdometer
                ? `Último registro: ${num(previousOdometer, 0)} km`
                : `Odômetro do painel ${words.ofThe}`
          }
        />
        {jump ? (
          <div className="-mt-3 space-y-2 rounded-2xl border border-destructive/30 px-3 py-2.5 text-sm text-foreground">
            <p className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{odometerJumpText(jump)}</span>
            </p>
            {jumpPending ? (
              <button
                type="button"
                onClick={() => {
                  setJumpConfirmed(odometerValue);
                  setError(null);
                }}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
              >
                O km está certo
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">Ok, vou salvar com esse km.</p>
            )}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            Encheu o tanque até a bomba desligar?
          </p>
          <ChoiceGroup
            label="Encheu o tanque até a bomba desligar?"
            fill
            value={fullTank ? "sim" : "nao"}
            onChange={(value) => setFullTank(value === "sim")}
            options={[
              { value: "nao", label: "Não, só um valor" },
              { value: "sim", label: "Sim, tanque cheio" },
            ]}
          />
          {fullTank ? (
            <p className="flex items-start gap-2 rounded-2xl bg-accent px-3 py-2.5 text-xs leading-relaxed text-accent-foreground">
              <Fuel className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">Tanque cheio marcado.</span> Este registro entra na
                medição do consumo real. Só confirme se a bomba desligou sozinha.
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Marque Sim se a bomba desligou sozinha: é o que mede o consumo real.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <TextField
            label="Posto (opcional)"
            value={station}
            maxLength={60}
            autoCapitalize="words"
            autoComplete="off"
            placeholder="Ex.: Posto da Av. 85"
            hint="Só você vê."
            onChange={(event) => setStation(event.target.value)}
          />
          {myStations.length > 0 && !station.trim() ? (
            <div className="flex flex-wrap gap-2" aria-label="Postos que você já usou">
              {myStations.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setStation(name)}
                  className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

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
              label={unit === "L" ? "Litros abastecidos" : "m³ abastecidos"}
              value={litersInput}
              onChange={setLitersInput}
              suffix={unit}
              hint="Só se você preferir informar os litros no lugar do preço."
            />
          </div>
        ) : null}

        {previewKml ? (
          <p className="text-sm text-muted-foreground">
            {words.Your} fez {kmPerLiter(previewKml.kmPerLiter)} nesse trecho.
            {previewKml.atypical
              ? " Bem fora do esperado: confira o km e se o tanque anterior foi completado."
              : ""}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {/* Sempre à mão, logo acima da barra inferior. */}
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 -mx-5 bg-background/95 px-5 py-2 backdrop-blur">
          <Action type="submit" loading={create.isPending} disabled={!canSubmit}>
            {create.isPending ? null : <Fuel className="h-5 w-5" />}
            Registrar abastecimento
          </Action>
        </div>
      </form>
    </AppShell>
  );
}

/** Seu preço x média da ANP na cidade, com fonte e semana. */
function CityPriceCard({ reference, paid }: { reference: ChosenReference; paid: number }) {
  const diff = Math.round((paid - reference.avgPrice) * 100) / 100;
  const where = reference.scope === "municipio" ? `de ${reference.place}` : `em ${reference.place}`;
  const of = referenceFuelName(reference.fuelTypeId).article === "a" ? "da" : "do";
  const good = diff <= 0;
  return (
    <AppCard className={good ? "border-primary/30 bg-accent/50" : "border-border"}>
      <p className={`text-base font-semibold ${good ? "text-primary" : "text-foreground"}`}>
        {Math.abs(diff) < 0.01
          ? `Na média ${where}`
          : `${brl(Math.abs(diff))}/${reference.unit} ${diff < 0 ? "abaixo" : "acima"} da média ${where}`}
      </p>
      <p className="mt-1 text-sm text-foreground">
        Você pagou {brl(paid)}. A média {of} {reference.fuelName} foi {brl(reference.avgPrice)}.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Fonte: ANP, semana de {weekLabel(reference.weekStart, reference.weekEnd)}.
      </p>
    </AppCard>
  );
}
