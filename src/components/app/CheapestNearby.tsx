import { Link } from "@tanstack/react-router";
import { ChevronRight, Fuel } from "lucide-react";
import { AppCard } from "@/components/app/Surface";
import { useCheapestStations } from "@/hooks/use-tanque";
import { referenceFuelName } from "@/services/anp";
import { brl } from "@/lib/format";
import { track } from "@/lib/analytics";

/** Início: os 3 postos mais baratos da semana (ANP) na cidade do perfil, com atalho para os 5. */
export function CheapestNearby({
  uf,
  city,
  fuelTypeId,
}: {
  uf: string | null;
  city: string | null;
  fuelTypeId: string;
}) {
  const stations = useCheapestStations(uf ?? "", city ?? "", fuelTypeId);
  const list = stations.data ?? [];
  if (!city || !list.length) return null;
  const fuel = referenceFuelName(fuelTypeId);
  const last = list[0].collected_on;
  return (
    <AppCard className="p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Fuel className="h-4 w-4 text-primary" />
        {fuel.name.charAt(0).toUpperCase() + fuel.name.slice(1)} mais barato em {city}
      </p>
      <ol className="mt-2 divide-y divide-border">
        {list.slice(0, 3).map((s, i) => (
          <li key={`${s.name}-${i}`} className="flex items-center gap-3 py-2">
            <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground">
              {i + 1}º
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {s.bairro ?? s.address}
              </span>
            </span>
            <span
              className={`shrink-0 text-sm font-semibold ${i === 0 ? "text-primary" : "text-foreground"}`}
            >
              {brl(Number(s.price))}/{fuel.unit}
            </span>
          </li>
        ))}
      </ol>
      <Link
        to="/precos"
        onClick={() => track("moment_opened", { id: "cheapest-nearby" })}
        className="flex min-h-11 items-center justify-between text-sm font-semibold text-primary"
      >
        Ver os 5 e como chegar
        <ChevronRight className="h-4 w-4" />
      </Link>
      <p className="text-xs text-muted-foreground">
        ANP{last ? `, coleta até ${last.slice(8, 10)}/${last.slice(5, 7)}` : ""}. Hoje pode ser
        outro.
      </p>
    </AppCard>
  );
}
