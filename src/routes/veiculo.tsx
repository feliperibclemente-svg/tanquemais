import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { AppCard, EmptyState, PageHeader, ScreenSkeleton } from "@/components/app/Surface";
import { useVehicles } from "@/hooks/use-tanque";
import { FUEL_LABEL } from "@/constants/app";
import { int } from "@/lib/format";

export const Route = createFileRoute("/veiculo")({
  head: () => ({
    meta: [
      { title: "Meus veículos — Tanque+" },
      { name: "description", content: "Gerencie os veículos cadastrados, odômetro e combustível padrão." },
      { property: "og:title", content: "Meus veículos — Tanque+" },
      { property: "og:description", content: "Veículos, odômetro atual e combustível preferido." },
    ],
  }),
  component: VeiculoPage,
});

function VeiculoPage() {
  const vehicles = useVehicles();

  return (
    <AppShell>
      <PageHeader title="Veículos" subtitle="Seus carros cadastrados no Tanque+" />

      {vehicles.isLoading ? (
        <ScreenSkeleton cards={2} />
      ) : vehicles.data && vehicles.data.length > 0 ? (
        <ul className="space-y-3">
          {vehicles.data.map((v) => (
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
            <Link
              to="/perfil"
              className="mt-1 flex min-h-11 items-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Ir para o perfil
            </Link>
          }
        />
      )}
    </AppShell>
  );
}
