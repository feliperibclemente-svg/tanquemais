import { Link } from "@tanstack/react-router";
import { BellRing, ChevronRight, MapPin, MapPinned, Sparkles, Wrench, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCheckups } from "@/hooks/use-tanque";
import { markRecapSeen, recapSeen, useMonthlyRecap } from "@/hooks/use-recap";
import { oilStatus } from "@/services/checkup";
import {
  dismissMoment,
  dismissedMoments,
  pickMoment,
  type MomentCandidate,
} from "@/services/moments";
import { chooseReference, referenceFuelName, weekLabel } from "@/services/anp";
import { localMonthKey } from "@/services/recap";
import { brl, num } from "@/lib/format";
import { track } from "@/lib/analytics";
import type { Vehicle } from "@/types/domain";

const DAY = 86_400_000;

/** Cartão do momento: um assunto por vez, o mais relevante agora. */
export function MomentCard({
  vehicle,
  odometers,
  reminder,
  lastFuelingId,
  fuelTypeId,
  references,
  place,
}: {
  vehicle: Vehicle;
  odometers: number[];
  reminder: { daysSince: number; typicalDays: number } | null;
  lastFuelingId: string | null;
  fuelTypeId: string | null;
  references: Parameters<typeof chooseReference>[0];
  place: { uf: string | null; city: string | null };
}) {
  const { recap } = useMonthlyRecap();
  const checkups = useCheckups();
  const [dismissed, setDismissed] = useState(dismissedMoments);

  const currentKm = Math.max(Number(vehicle.current_odometer) || 0, ...odometers) || null;
  const oil = oilStatus({
    lastKm: vehicle.oil_change_km,
    intervalKm: vehicle.oil_change_interval_km,
    currentKm,
  });
  const fuel = fuelTypeId ?? vehicle.fuel_type_id ?? "gasolina";
  const ref = place.uf ? chooseReference(references, place, fuel, new Date()) : null;
  const lastCheckup = checkups.data?.find((c) => c.vehicle_id === vehicle.id);
  const checkupDue =
    !checkups.isLoading &&
    odometers.length > 0 &&
    (!lastCheckup || Date.now() - new Date(lastCheckup.created_at).getTime() > 30 * DAY);

  const recapReady = !!recap && recap.slides.length >= 3 && !recapSeen(recap.key);
  const moment = pickMoment(
    [
      recapReady && { id: "recap", key: `recap:${recap!.key}` },
      reminder && lastFuelingId && { id: "reminder", key: `reminder:${lastFuelingId}` },
      (oil.state === "due" || oil.state === "soon") && {
        id: "oil",
        key: `oil:${oil.dueKm}:${oil.state}`,
      },
      ref && { id: "price-week", key: `anp:${ref.weekStart}:${fuel}:${ref.place}` },
      checkupDue && { id: "checkup", key: `checkup:${localMonthKey(new Date())}` },
      !place.city && odometers.length > 0 && { id: "city-missing", key: "city-missing" },
    ] as (MomentCandidate | false | null | undefined)[],
    dismissed,
  );
  if (!moment) return null;

  const close = () => {
    dismissMoment(moment.key);
    if (moment.id === "recap" && recap) markRecapSeen(recap.key);
    track("moment_dismissed", { id: moment.id });
    setDismissed(dismissedMoments());
  };
  const opened = () => {
    dismissMoment(moment.key);
    track("moment_opened", { id: moment.id });
  };

  if (moment.id === "recap" && recap) {
    return (
      <Link
        to="/retrospectiva"
        onClick={() => track("moment_opened", { id: "recap" })}
        className="flex items-center gap-3 rounded-3xl bg-[linear-gradient(135deg,#1E9A66,#0D5C3B)] p-4 text-white shadow-[0_18px_40px_-22px_#1E9A66]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">
            {recap.partial
              ? `Seu ${recap.monthName} até agora`
              : `Sua retrospectiva de ${recap.monthName}`}
          </span>
          <span className="block text-sm text-white/80">Veja e compartilhe seus números</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0" />
      </Link>
    );
  }

  const content: Record<
    Exclude<MomentCandidate["id"], "recap">,
    { icon: ReactNode; title: string; body: string; to: string; cta: string }
  > = {
    reminder: {
      icon: <BellRing className="h-5 w-5" />,
      title: "Abasteceu nos últimos dias?",
      body: reminder
        ? `Faz ${reminder.daysSince} dias do último registro e você costuma abastecer a cada ${reminder.typicalDays === 1 ? "1 dia" : `${reminder.typicalDays} dias`}.`
        : "",
      to: "/abastecer",
      cta: "Registrar agora",
    },
    oil: {
      icon: <Wrench className="h-5 w-5" />,
      title: oil.state === "due" ? "Troca de óleo passou do prazo" : "Troca de óleo chegando",
      body:
        oil.state === "due"
          ? `Passou ${num(oil.over, 0)} km do prazo. Óleo vencido protege menos o motor.`
          : oil.state === "soon"
            ? `Faltam cerca de ${num(oil.remaining, 0)} km. Dá para agendar com calma.`
            : "",
      to: "/checkup",
      cta: "Ver check-up",
    },
    "price-week": {
      icon: <MapPinned className="h-5 w-5" />,
      title: ref ? `Preço da semana em ${ref.place}` : "",
      body: ref
        ? `Média ${referenceFuelName(ref.fuelTypeId).article === "a" ? "da" : "do"} ${ref.fuelName}: ${brl(ref.avgPrice)}/${ref.unit}. ANP, ${weekLabel(ref.weekStart, ref.weekEnd)}.`
        : "",
      to: "/precos",
      cta: "Ver preços por cidade",
    },
    checkup: {
      icon: <Wrench className="h-5 w-5" />,
      title: lastCheckup ? "Faz um mês do último check-up" : "Check-up rápido do veículo",
      body: "Perguntas rápidas sobre o que você tem percebido e um resumo para levar à oficina.",
      to: "/checkup",
      cta: lastCheckup ? "Refazer o check-up" : "Fazer o check-up",
    },
    "city-missing": {
      icon: <MapPin className="h-5 w-5" />,
      title: "Compare com a média da sua cidade",
      body: "Informe sua cidade e eu mostro se você pagou acima ou abaixo da média (ANP).",
      to: "/perfil",
      cta: "Informar cidade",
    },
  };
  const c = content[moment.id as Exclude<MomentCandidate["id"], "recap">];

  return (
    <div className="relative rounded-3xl border border-primary/25 bg-accent/40 p-4">
      <button
        type="button"
        aria-label="Dispensar"
        onClick={close}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card text-primary">
          {c.icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{c.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          <Link
            to={c.to}
            onClick={opened}
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
          >
            {c.cta} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
