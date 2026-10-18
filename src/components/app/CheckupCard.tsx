import { Link } from "@tanstack/react-router";
import { ChevronRight, Wrench } from "lucide-react";
import { ActionLink } from "@/components/ds/action";
import { AppCard } from "@/components/app/Surface";
import { useCheckups } from "@/hooks/use-tanque";
import { oilStatus, type OilState } from "@/services/checkup";
import { num } from "@/lib/format";
import type { Vehicle } from "@/types/domain";

/** Um novo check-up é sugerido a cada 30 dias. */
const CHECKUP_EVERY_DAYS = 30;
const DAY = 86_400_000;

function currentKmOf(vehicle: Vehicle, odometers: number[]) {
  return Math.max(Number(vehicle.current_odometer) || 0, ...odometers) || null;
}

function oilOf(vehicle: Vehicle, odometers: number[]): OilState {
  return oilStatus({
    lastKm: vehicle.oil_change_km,
    intervalKm: vehicle.oil_change_interval_km,
    currentKm: currentKmOf(vehicle, odometers),
  });
}

function oilLine(oil: OilState): string | null {
  if (oil.state === "due") return `Troca de óleo passou ${num(oil.over, 0)} km do prazo`;
  if (oil.state === "soon") return `Troca de óleo em cerca de ${num(oil.remaining, 0)} km`;
  if (oil.state === "ok") return `Próxima troca de óleo aos ${num(oil.dueKm, 0)} km`;
  return null;
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

/** Cartão do Painel: último check-up, troca de óleo e botão para fazer/refazer. */
export function CheckupCard({ vehicle, odometers }: { vehicle: Vehicle; odometers: number[] }) {
  const checkups = useCheckups();
  const last = checkups.data?.find((c) => c.vehicle_id === vehicle.id);
  const oil = oilLine(oilOf(vehicle, odometers));
  const days = last ? daysAgo(last.created_at) : null;

  return (
    <AppCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
          <Wrench className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Check-up do veículo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {last
              ? `Último ${days === 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`}: ${
                  last.findings.length === 0
                    ? "nada de estranho"
                    : last.findings.length === 1
                      ? "1 item para conferir"
                      : `${last.findings.length} itens para conferir`
                }.`
              : "Perguntas rápidas sobre o que você tem percebido. No fim, um resumo para levar à oficina."}
          </p>
          {oil ? <p className="mt-1 text-xs font-medium text-foreground">{oil}</p> : null}
        </div>
      </div>
      <ActionLink
        to="/checkup"
        size="md"
        variant={last && days! < CHECKUP_EVERY_DAYS ? "secondary" : undefined}
        className="mt-3 w-full"
      >
        {last ? "Refazer o check-up" : "Fazer o check-up"}
      </ActionLink>
    </AppCard>
  );
}

/**
 * Lembrete discreto no Início: troca de óleo chegando/vencida ou check-up com mais de 30
 * dias (ou nunca feito, para quem já registra abastecimentos). Nada a dizer: não aparece.
 */
export function CheckupNudge({ vehicle, odometers }: { vehicle: Vehicle; odometers: number[] }) {
  const checkups = useCheckups();
  if (checkups.isLoading) return null;
  const oil = oilOf(vehicle, odometers);
  const last = checkups.data?.find((c) => c.vehicle_id === vehicle.id);

  let text: string | null = null;
  if (oil.state === "due") text = `Troca de óleo passou ${num(oil.over, 0)} km do prazo`;
  else if (oil.state === "soon") text = `Troca de óleo em cerca de ${num(oil.remaining, 0)} km`;
  else if (!last && odometers.length > 0) text = "Que tal um check-up rápido do veículo?";
  else if (last && daysAgo(last.created_at) >= CHECKUP_EVERY_DAYS)
    text = "Faz um mês do último check-up. Vamos refazer?";
  if (!text) return null;

  return (
    <Link
      to="/checkup"
      className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
    >
      <Wrench className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{text}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
