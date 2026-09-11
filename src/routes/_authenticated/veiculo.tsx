import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Action,
  AppCard,
  AppShell,
  ConfirmAction,
  EmptyState,
  PageHeader,
  ScreenSkeleton,
  SelectField,
  TextField,
} from "@/components/ds";
import { FUEL_LABEL, FUEL_TYPES } from "@/constants/app";
import { int } from "@/lib/format";
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicles,
} from "@/hooks/use-tanque";
import { useAuth } from "@/providers/AuthProvider";
import { vehiclesRepository } from "@/repositories";
import type { Vehicle } from "@/types/domain";
import { vehicleSchema } from "@/validators";

export const Route = createFileRoute("/_authenticated/veiculo")({
  head: () => ({
    meta: [
      { title: "Meus veículos — Tanque+" },
      {
        name: "description",
        content: "Cadastre e gerencie seus veículos, odômetro e combustível padrão no Tanque+.",
      },
      { property: "og:title", content: "Meus veículos — Tanque+" },
      { property: "og:description", content: "Veículos, odômetro atual e combustível preferido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VeiculoPage,
});

const EMPTY = {
  nickname: "",
  brand: "",
  model: "",
  year: "",
  fuel_type_id: "gasolina",
  tank_liters: "",
  current_odometer: "",
};

function VeiculoPage() {
  const { user } = useAuth();
  const vehicles = useVehicles();
  const create = useCreateVehicle();
  const remove = useDeleteVehicle();

  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const list = vehicles.data ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = vehicleSchema.safeParse({
      ...values,
      year: values.year || undefined,
      tank_liters: values.tank_liters || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados do veículo.");
      return;
    }
    await create.mutateAsync({
      draft: {
        nickname: parsed.data.nickname || null,
        brand: parsed.data.brand,
        model: parsed.data.model,
        year: parsed.data.year ?? null,
        fuel_type_id: parsed.data.fuel_type_id,
        tank_liters: parsed.data.tank_liters ?? null,
        current_odometer: parsed.data.current_odometer,
      },
      isPrimary: list.length === 0,
    });
    setForm(false);
    setValues(EMPTY);
  }

  async function makePrimary(id: string) {
    if (!user) return;
    await vehiclesRepository.setPrimary(user.id, id);
    await vehicles.refetch();
    toast.success("Veículo principal atualizado");
  }

  return (
    <AppShell>
      <PageHeader
        title="Veículos"
        subtitle="Seus carros cadastrados no Tanque+"
        action={
          <Action
            size="icon"
            onClick={() => setForm((v) => !v)}
            aria-label={form ? "Fechar formulário" : "Adicionar veículo"}
          >
            <Plus className={`h-5 w-5 transition-transform ${form ? "rotate-45" : ""}`} />
          </Action>
        }
      />

      {form ? (
        <AppCard className="mb-4">
          <form onSubmit={submit} className="space-y-3">
            <TextField
              label="Apelido"
              hint="Opcional — ex: Carro do trabalho"
              value={values.nickname}
              onChange={(e) => setValues({ ...values, nickname: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Marca"
                value={values.brand}
                onChange={(e) => setValues({ ...values, brand: e.target.value })}
              />
              <TextField
                label="Modelo"
                value={values.model}
                onChange={(e) => setValues({ ...values, model: e.target.value })}
              />
              <TextField
                label="Ano"
                inputMode="numeric"
                value={values.year}
                onChange={(e) => setValues({ ...values, year: e.target.value })}
              />
              <TextField
                label="Tanque (L)"
                inputMode="numeric"
                value={values.tank_liters}
                onChange={(e) => setValues({ ...values, tank_liters: e.target.value })}
              />
            </div>
            <SelectField
              label="Combustível padrão"
              value={values.fuel_type_id}
              onChange={(e) => setValues({ ...values, fuel_type_id: e.target.value })}
              options={FUEL_TYPES.map((f) => ({ value: f.id, label: f.label }))}
            />
            <TextField
              label="Quilometragem atual"
              inputMode="numeric"
              value={values.current_odometer}
              onChange={(e) => setValues({ ...values, current_odometer: e.target.value })}
            />
            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <Action type="submit" loading={create.isPending}>
              Salvar veículo
            </Action>
          </form>
        </AppCard>
      ) : null}

      {vehicles.isLoading ? (
        <ScreenSkeleton cards={2} />
      ) : list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((v) => (
            <li key={v.id}>
              <AppCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {v.nickname || `${v.brand} ${v.model}`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.brand} {v.model}
                      {v.year ? ` · ${v.year}` : ""}
                      {v.fuel_type_id ? ` · ${FUEL_LABEL[v.fuel_type_id] ?? v.fuel_type_id}` : ""}
                    </p>
                  </div>
                  {v.is_primary ? (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                      Principal
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  Odômetro atual:{" "}
                  <span className="font-medium text-foreground">{int(v.current_odometer)} km</span>
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  {!v.is_primary ? (
                    <Action variant="ghost" size="sm" onClick={() => makePrimary(v.id)}>
                      <Star className="h-4 w-4" /> Tornar principal
                    </Action>
                  ) : null}
                  <ConfirmAction
                    title="Remover veículo?"
                    description="Os abastecimentos ligados a este veículo também deixarão de ser exibidos."
                    confirmLabel="Remover"
                    onConfirm={() => remove.mutate(v.id)}
                    trigger={
                      <Action variant="danger-ghost" size="sm" className="ml-auto">
                        <Trash2 className="h-4 w-4" /> Remover
                      </Action>
                    }
                  />
                </div>
              </AppCard>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          emoji="🚗"
          title="Nenhum veículo cadastrado"
          description="Cadastre um veículo para registrar abastecimentos e acompanhar o consumo."
          action={
            <Action size="md" className="mt-1" onClick={() => setForm(true)}>
              Cadastrar veículo
            </Action>
          }
        />
      )}
    </AppShell>
  );
}
