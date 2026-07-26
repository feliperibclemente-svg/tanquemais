import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Fuel, Plus, Sparkles } from "lucide-react";
import { MobileShell, Card, StatCard } from "@/components/MobileShell";
import {
  brl,
  num,
  summary,
  tanqueIA,
  uid,
  useFillups,
  useProfile,
  useVehicles,
  type Vehicle,
} from "@/lib/tanque";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tanque+ — Economize combustível e acompanhe seu consumo" },
      {
        name: "description",
        content:
          "Registre abastecimentos e veja consumo médio, custo por km, gasto mensal e insights da TanqueIA para economizar.",
      },
      { property: "og:title", content: "Tanque+ — Assistente inteligente de abastecimento" },
      {
        property: "og:description",
        content: "Consumo, custo por km, histórico e postos mais baratos perto de você.",
      },
    ],
  }),
  component: HomePage,
});

const slides = [
  { emoji: "🚘", title: "Descubra quanto realmente custa dirigir seu carro." },
  { emoji: "⛽", title: "Controle seus abastecimentos automaticamente." },
  { emoji: "💸", title: "Economize abastecendo nos postos mais baratos próximos de você." },
];

function HomePage() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const fillups = useFillups();

  if (!profile.ready || !vehicles.ready) return <div className="min-h-screen bg-background" />;
  if (!profile.value.onboarded) return <Onboarding onDone={(name) => profile.setValue({ name, onboarded: true })} />;
  if (vehicles.value.length === 0)
    return <VehicleForm onSave={(v) => vehicles.setValue([...vehicles.value, v])} />;

  const s = summary(fillups.value);
  const insights = tanqueIA(fillups.value);
  const firstName = profile.value.name.split(" ")[0] || "motorista";

  return (
    <MobileShell>
      <div className="fade-up space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {firstName} 👋</p>
            <p className="text-lg font-semibold text-foreground">
              {vehicles.value[0].brand} {vehicles.value[0].model}
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Fuel className="h-5 w-5" />
          </span>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <p className="text-sm/none opacity-90">Gasto este mês</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">{brl(s.monthSpend)}</p>
          <p className="mt-3 text-xs opacity-90">
            {s.stats.length} abastecimento{s.stats.length === 1 ? "" : "s"} registrado
            {s.stats.length === 1 ? "" : "s"}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatCard emoji="⛽" label="Consumo médio" value={`${num(s.avg)} km/L`} />
          <StatCard emoji="🚗" label="Quilômetros rodados" value={`${num(s.km, 0)} km`} />
          <StatCard emoji="💰" label="Custo por quilômetro" value={brl(s.costPerKm)} />
          <StatCard emoji="📈" label="Economia estimada" value={brl(s.savings)} />
        </div>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">TanqueIA</p>
          </div>
          {insights.map((i) => (
            <p key={i} className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              {i}
            </p>
          ))}
        </Card>

        <Link
          to="/abastecer"
          className="flex items-center justify-center gap-2 rounded-3xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" /> Registrar abastecimento
        </Link>
      </div>
    </MobileShell>
  );
}

function Onboarding({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const last = step === slides.length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-10">
      {!last ? (
        <>
          <div className="fade-up flex flex-1 flex-col items-center justify-center text-center" key={step}>
            <div className="flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-primary-soft text-6xl">
              {slides[step].emoji}
            </div>
            <h1 className="mt-10 text-3xl font-semibold leading-tight tracking-tight text-foreground">
              {slides[step].title}
            </h1>
          </div>
          <div className="space-y-6">
            <div className="flex justify-center gap-2">
              {slides.map((s, i) => (
                <span
                  key={s.emoji}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
                />
              ))}
            </div>
            <button
              onClick={() => setStep(step + 1)}
              className="flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-6 py-4 font-semibold text-primary-foreground active:scale-[0.98]"
            >
              {step === slides.length - 1 ? "Começar" : "Continuar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="fade-up flex flex-1 flex-col justify-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Como podemos te chamar?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Usamos seu nome para personalizar o app.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="mt-6 w-full rounded-2xl border border-input bg-card px-4 py-4 text-base outline-none focus:border-primary"
          />
          <button
            disabled={!name.trim()}
            onClick={() => onDone(name.trim())}
            className="mt-6 w-full rounded-3xl bg-primary px-6 py-4 font-semibold text-primary-foreground disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}

const field =
  "w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none focus:border-primary";

function VehicleForm({ onSave }: { onSave: (v: Vehicle) => void }) {
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
    engine: "",
    fuel: "Flex",
    transmission: "Automático",
    odometer: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });
  const valid = form.brand && form.model && form.year && form.odometer;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cadastre seu veículo</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Em breve você poderá gerenciar vários veículos no Tanque+.
      </p>
      <div className="mt-6 space-y-3">
        <input className={field} placeholder="Marca" value={form.brand} onChange={set("brand")} />
        <input className={field} placeholder="Modelo" value={form.model} onChange={set("model")} />
        <div className="grid grid-cols-2 gap-3">
          <input className={field} placeholder="Ano" inputMode="numeric" value={form.year} onChange={set("year")} />
          <input className={field} placeholder="Motor (1.0)" value={form.engine} onChange={set("engine")} />
        </div>
        <select className={field} value={form.fuel} onChange={set("fuel")}>
          {["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select className={field} value={form.transmission} onChange={set("transmission")}>
          {["Manual", "Automático", "CVT", "Automatizado"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          className={field}
          placeholder="Quilometragem atual"
          inputMode="numeric"
          value={form.odometer}
          onChange={set("odometer")}
        />
      </div>
      <button
        disabled={!valid}
        onClick={() => onSave({ id: uid(), ...form, odometer: Number(form.odometer) })}
        className="mt-8 w-full rounded-3xl bg-primary px-6 py-4 font-semibold text-primary-foreground disabled:opacity-40"
      >
        Salvar veículo
      </button>
    </div>
  );
}
