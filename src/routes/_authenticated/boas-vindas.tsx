import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Fuel } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  BrandModelFields,
  ChoiceGroup,
  NumericField,
  parseDecimal,
  ScreenSkeleton,
} from "@/components/ds";
import { FUEL_TYPES } from "@/constants/app";
import { canonicalVehicle } from "@/constants/vehicles";
import { useCreateVehicle, useProfile, useVehicles } from "@/hooks/use-tanque";
import { track } from "@/lib/analytics";
import { vehicleSchema } from "@/validators";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/_authenticated/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Boas-vindas — Tanque+" },
      { name: "description", content: "Cadastre seu veículo em segundos e comece a economizar." },
    ],
  }),
  component: WelcomePage,
});

/**
 * Primeiro acesso: veículo em uma tela só (marca, modelo, combustível e km) e, em seguida,
 * o convite para o primeiro abastecimento. Apelido, ano e tanque ficam para depois.
 */
function WelcomePage() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const create = useCreateVehicle();

  const [vehicle, setVehicle] = useState({ brand: "", model: "" });
  const [fuel, setFuel] = useState("gasolina");
  const [odometer, setOdometer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const firstName = (profile.data?.full_name ?? "").split(" ")[0];
  const hasVehicle = (vehicles.data ?? []).length > 0;

  useEffect(() => {
    track("onboarding_started");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!odometer) {
      setError("Informe a quilometragem que aparece no painel.");
      return;
    }
    const parsed = vehicleSchema.safeParse({
      ...canonicalVehicle(vehicle.brand, vehicle.model),
      fuel_type_id: fuel,
      current_odometer: parseDecimal(odometer),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados do veículo.");
      return;
    }
    try {
      await create.mutateAsync({
        draft: {
          brand: parsed.data.brand,
          model: parsed.data.model,
          fuel_type_id: parsed.data.fuel_type_id,
          current_odometer: parsed.data.current_odometer,
        },
        isPrimary: !hasVehicle,
      });
      track("onboarding_vehicle_saved", { fuel_type: fuel });
      setDone(true);
    } catch {
      /* o hook já mostra o erro */
    }
  }

  if (profile.isLoading || vehicles.isLoading) {
    return (
      <Shell>
        <ScreenSkeleton cards={2} />
      </Shell>
    );
  }

  if (done || (hasVehicle && !create.isSuccess)) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {done ? "Veículo pronto!" : "Seu veículo já está cadastrado"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Agora é só registrar cada abastecimento. Leva uns 20 segundos.
          </p>
        </div>

        <AppCard className="mt-6 space-y-2 p-4 text-sm">
          <p className="font-semibold text-foreground">Como medimos seu consumo real</p>
          <p className="text-muted-foreground">
            Sempre que puder,{" "}
            <span className="font-semibold text-foreground">complete o tanque</span> e informe o km
            do painel. Com dois tanques cheios seguidos, mostramos quantos km/L seu carro faz de
            verdade.
          </p>
        </AppCard>

        <div className="mt-6 space-y-3">
          <ActionLink to="/abastecer" size="lg">
            <Fuel className="h-5 w-5" /> Registrar abastecimento de hoje
          </ActionLink>
          <ActionLink to="/app" variant="ghost">
            Vou registrar no próximo
          </ActionLink>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Boas-vindas{firstName ? `, ${firstName}` : ""}!
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        Qual é o seu veículo?
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Só o essencial. Apelido, ano e tanque você completa depois, se quiser.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <BrandModelFields brand={vehicle.brand} model={vehicle.model} onChange={setVehicle} />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Combustível que você mais usa</p>
          <ChoiceGroup
            label="Combustível"
            value={fuel}
            onChange={setFuel}
            options={FUEL_TYPES.map((f) => ({ value: f.id, label: f.short }))}
          />
        </div>

        <NumericField
          label="Quilometragem atual"
          value={odometer}
          onChange={setOdometer}
          inputMode="numeric"
          suffix="km"
          hint="O número do odômetro, no painel do carro"
        />

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Action type="submit" loading={create.isPending}>
          Continuar
        </Action>
      </form>
    </Shell>
  );
}

/** Layout enxuto, sem a navegação inferior: o foco é terminar o cadastro. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Link to="/app" className="mb-8 flex items-center gap-2" aria-label="Tanque+">
        <Logo className="h-7" />
      </Link>
      {children}
    </div>
  );
}
