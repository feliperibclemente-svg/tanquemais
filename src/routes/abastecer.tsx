import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/MobileShell";
import {
  brl,
  num,
  uid,
  useFillups,
  useVehicles,
  withStats,
  type FuelType,
  type Fillup,
} from "@/lib/tanque";

export const Route = createFileRoute("/abastecer")({
  head: () => ({
    meta: [
      { title: "Registrar abastecimento — Tanque+" },
      {
        name: "description",
        content: "Registre valor pago, preço do litro e quilometragem: o Tanque+ calcula litros e rendimento.",
      },
      { property: "og:title", content: "Registrar abastecimento — Tanque+" },
      { property: "og:description", content: "Cálculo automático de litros, consumo e custo por km." },
    ],
  }),
  component: NewFillup,
});

const field =
  "w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none focus:border-primary";

const fuels: { key: FuelType; label: string }[] = [
  { key: "gasolina", label: "Gasolina" },
  { key: "etanol", label: "Etanol" },
  { key: "diesel", label: "Diesel" },
];

function NewFillup() {
  const navigate = useNavigate();
  const fillups = useFillups();
  const vehicles = useVehicles();
  const [saved, setSaved] = useState<Fillup | null>(null);
  const [form, setForm] = useState({ amount: "", price: "", odometer: "", station: "" });
  const [fuel, setFuel] = useState<FuelType>("gasolina");

  const amount = Number(form.amount.replace(",", "."));
  const price = Number(form.price.replace(",", "."));
  const liters = amount > 0 && price > 0 ? amount / price : 0;
  const valid = liters > 0 && Number(form.odometer) > 0;

  const save = () => {
    const entry: Fillup = {
      id: uid(),
      vehicleId: vehicles.value[0]?.id ?? "default",
      date: new Date().toISOString(),
      amountPaid: amount,
      pricePerLiter: price,
      liters,
      odometer: Number(form.odometer),
      fuel,
      station: form.station.trim() || undefined,
    };
    fillups.setValue([...fillups.value, entry]);
    setSaved(entry);
  };

  if (saved) {
    const stats = withStats([...fillups.value]);
    const current = stats.find((f) => f.id === saved.id);
    return (
      <div className="mx-auto min-h-screen w-full max-w-md px-6 py-12">
        <div className="fade-up flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CheckCircle2 className="h-10 w-10" />
          </span>
          <p className="mt-6 text-sm text-muted-foreground">Você abasteceu</p>
          <p className="text-4xl font-semibold tracking-tight text-foreground">{num(saved.liters, 2)} litros</p>
          <p className="mt-3 text-sm text-muted-foreground">Valor</p>
          <p className="text-2xl font-semibold text-foreground">{brl(saved.amountPaid)}</p>
        </div>

        {current?.kmPerLiter ? (
          <Card className="mt-8 space-y-3">
            <Row label="Você percorreu" value={`${num(current.distance ?? 0, 0)} km`} />
            <Row label="Seu veículo fez" value={`${num(current.kmPerLiter)} km/L`} />
            <Row label="Seu custo foi" value={`${brl(current.costPerKm ?? 0)} por km`} />
            <Row label="Litros consumidos" value={`${num(saved.liters, 2)} L`} />
          </Card>
        ) : (
          <Card className="mt-8 text-center text-sm text-muted-foreground">
            No próximo abastecimento calcularemos automaticamente seu rendimento.
          </Card>
        )}

        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-8 w-full rounded-3xl bg-primary px-6 py-4 font-semibold text-primary-foreground"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Registrar abastecimento</h1>

      <div className="mt-6 space-y-3">
        <Labeled label="Valor pago (R$)">
          <input
            className={field}
            inputMode="decimal"
            placeholder="200,00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </Labeled>
        <Labeled label="Valor por litro (R$)">
          <input
            className={field}
            inputMode="decimal"
            placeholder="5,79"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Labeled>
        <Labeled label="Quilometragem atual">
          <input
            className={field}
            inputMode="numeric"
            placeholder="42.500"
            value={form.odometer}
            onChange={(e) => setForm({ ...form, odometer: e.target.value })}
          />
        </Labeled>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Tipo de combustível</p>
          <div className="grid grid-cols-3 gap-2">
            {fuels.map((f) => (
              <button
                key={f.key}
                onClick={() => setFuel(f.key)}
                className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                  fuel === f.key
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-input bg-card text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Labeled label="Nome do posto (opcional)">
          <input
            className={field}
            placeholder="Posto Ipiranga Centro"
            value={form.station}
            onChange={(e) => setForm({ ...form, station: e.target.value })}
          />
        </Labeled>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-input bg-card px-4 py-4 text-sm text-muted-foreground">
          <Camera className="h-4 w-4" /> Foto da nota fiscal (opcional)
          <input type="file" accept="image/*" className="hidden" />
        </label>

        <Card className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Quantidade de litros</span>
          <span className="text-xl font-semibold text-primary">{num(liters, 2)} L</span>
        </Card>
      </div>

      <button
        disabled={!valid}
        onClick={save}
        className="mt-6 w-full rounded-3xl bg-primary px-6 py-4 font-semibold text-primary-foreground disabled:opacity-40"
      >
        Salvar abastecimento
      </button>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
