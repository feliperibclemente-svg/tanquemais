import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  SelectField,
  TeoSays,
  TextField,
} from "@/components/ds";
import { FUEL_TYPES, GENDER_OPTIONS } from "@/constants/app";
import { canonicalVehicle, vehicleWords, fuelsFor } from "@/constants/vehicles";
import { useCreateVehicle, useProfile, useUpdateProfile, useVehicles } from "@/hooks/use-tanque";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";
import {
  ageRangeOf,
  checkBirthDate,
  firstNameOf,
  formatBirthDate,
  maskDate,
  needsIdentity,
  splitFullName,
  tidyName,
} from "@/services/identity";
import type { Profile } from "@/types/domain";
import { track } from "@/lib/analytics";
import { vehicleSchema } from "@/validators";
import { Logo } from "@/components/app/Logo";
import { markTourSeen, TeoStories, tourSeen } from "@/components/app/TeoStories";

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
 * Primeiro acesso: apresentação em stories (Teo), depois duas etapas curtas:
 * 1. Sobre você — nome, sobrenome e data de nascimento (o Tanque+ é para maiores de 18).
 * 2. Veículo — marca, modelo, combustível e km; depois, o convite ao primeiro abastecimento.
 */
function WelcomePage() {
  const profile = useProfile();
  const p = profile.data ?? null;
  const [tourDone, setTourDone] = useState(() => tourSeen());

  if (profile.isLoading) {
    return (
      <Shell>
        <ScreenSkeleton cards={2} />
      </Shell>
    );
  }
  // Conta nova: antes do cadastro, o Teo apresenta o app em stories.
  if (p && needsIdentity(p) && !tourDone) {
    return (
      <TeoStories
        onDone={(reason) => {
          markTourSeen();
          track(reason === "completed" ? "tour_completed" : "tour_skipped", { from: "onboarding" });
          setTourDone(true);
        }}
      />
    );
  }
  if (p && needsIdentity(p)) return <AboutYouStep profile={p} />;
  return <VehicleStep />;
}

/** Etapa 1: quem é você. O primeiro nome é como o app (e o Teo) chamam a pessoa. */
function AboutYouStep({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const removeAccount = useServerFn(deleteMyAccount);
  const prefill = splitFullName(profile.full_name);

  const [first, setFirst] = useState(profile.first_name ?? tidyName(prefill.first));
  const [last, setLast] = useState(profile.last_name ?? tidyName(prefill.last));
  const [birth, setBirth] = useState(formatBirthDate(profile.birth_date));
  const [gender, setGender] = useState(profile.gender ?? "");
  const [error, setError] = useState<string | null>(null);
  const [minor, setMinor] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const firstName = tidyName(first);
    const lastName = tidyName(last);
    if (firstName.length < 2) return setError("Informe seu nome.");
    if (lastName.length < 2) return setError("Informe seu sobrenome.");
    const check = checkBirthDate(birth);
    if (!check.ok) {
      if (check.reason === "minor") {
        track("onboarding_underage");
        setMinor(true);
        return;
      }
      return setError(
        check.reason === "invalid"
          ? "Confira a data no formato dd/mm/aaaa."
          : "Confira a data de nascimento.",
      );
    }
    try {
      await update.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        birth_date: check.iso,
        age_range: ageRangeOf(check.age),
        gender: gender || null,
      });
      track("onboarding_identity_saved", { gender: !!gender });
    } catch {
      /* o hook já mostra o erro */
    }
  }

  async function deleteAndLeave() {
    setLeaving(true);
    try {
      await removeAccount();
    } catch {
      /* mesmo sem excluir, encerramos a sessão */
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (minor) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          O Tanque+ é para maiores de 18 anos
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O app foi feito para quem já pode dirigir com CNH. Não salvamos sua data de nascimento.
          Você pode excluir este cadastro agora; quando completar 18 anos, será bem-vindo de volta.
        </p>
        <div className="mt-6 space-y-3">
          <Action variant="danger" loading={leaving} onClick={deleteAndLeave}>
            Excluir meu cadastro e sair
          </Action>
          <Action variant="ghost" onClick={() => setMinor(false)}>
            Digitei a data errada
          </Action>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TeoSays spot="welcome" size="lg" mood="tip" title="Primeiro, seus dados básicos.">
        É assim que vou te chamar no app. Nada disso aparece para outras pessoas.
      </TeoSays>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Sobre você</h1>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Nome"
            value={first}
            autoComplete="given-name"
            autoCapitalize="words"
            onChange={(event) => setFirst(event.target.value)}
          />
          <TextField
            label="Sobrenome"
            value={last}
            autoComplete="family-name"
            autoCapitalize="words"
            onChange={(event) => setLast(event.target.value)}
          />
        </div>
        <TextField
          label="Data de nascimento"
          value={birth}
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          hint="Para confirmar que você tem 18 anos ou mais. Não aparece para ninguém."
          onChange={(event) => setBirth(maskDate(event.target.value))}
        />
        <SelectField
          label="Gênero (opcional)"
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          hint="Só entra em números gerais do beta, sem identificar você."
          options={[{ value: "", label: "Selecione" }, ...GENDER_OPTIONS]}
        />

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Action type="submit" loading={update.isPending}>
          Continuar
        </Action>
      </form>
    </Shell>
  );
}

/** Etapa 2: veículo em uma tela só; apelido, ano e tanque ficam para depois. */
function VehicleStep() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const create = useCreateVehicle();
  const welcome = useServerFn(sendWelcomeEmail);

  const [vehicle, setVehicle] = useState({ brand: "", model: "" });
  const [fuel, setFuel] = useState("gasolina");
  const [odometer, setOdometer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const firstName = firstNameOf(profile.data ?? null);
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
      // E-mail de boas-vindas: uma vez por pessoa (o servidor garante); não trava a tela.
      void welcome()
        .then((r) => r.sent && track("welcome_email_sent"))
        .catch(() => undefined);
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
            do painel. Com dois tanques cheios seguidos, mostramos quantos km/L{" "}
            {vehicleWords(vehicle.brand).your} faz de verdade.
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
      <TeoSays
        spot="welcome-vehicle"
        size="lg"
        mood="tip"
        title={`Prazer${firstName ? `, ${firstName}` : ""}!`}
      >
        Agora me conta qual é o seu veículo — só o essencial; o resto você completa depois, se
        quiser.
      </TeoSays>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Qual é o seu veículo?
      </h1>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <BrandModelFields brand={vehicle.brand} model={vehicle.model} onChange={setVehicle} />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Combustível que você mais usa</p>
          <ChoiceGroup
            label="Combustível"
            value={fuel}
            onChange={setFuel}
            options={fuelsFor(vehicle.brand, FUEL_TYPES).map((f) => ({
              value: f.id,
              label: f.short,
            }))}
          />
        </div>

        <NumericField
          label="Quilometragem atual"
          value={odometer}
          onChange={setOdometer}
          inputMode="numeric"
          suffix="km"
          hint={`O número do odômetro, no painel ${vehicleWords(vehicle.brand).ofThe}`}
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
