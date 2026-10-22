import { Link } from "@tanstack/react-router";
import { BellRing, CalendarDays, ChevronRight, MapPin, MapPinned, Wrench, X } from "lucide-react";
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
import { chooseReference, weekLabel } from "@/services/anp";
import { cityWeek, cityWeekLines } from "@/services/city-week";
import { localMonthKey } from "@/services/recap";
import { num } from "@/lib/format";
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
  const week = place.uf ? cityWeek(references, place, fuel, new Date()) : null;
  const ref = week?.ref ?? null;
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
        className="flex items-center gap-3 rounded-3xl bg-primary p-4 text-primary-foreground"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <CalendarDays className="h-5 w-5" />
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
    {
      icon: ReactNode;
      title: string;
      body: string | string[];
      note?: string;
      to: string;
      cta: string;
    }
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
      title: ref ? `${ref.place} nesta semana` : "",
      body: week ? cityWeekLines(week, vehicle.tank_liters) : "",
      note: ref ? `Pesquisa da ANP, ${weekLabel(ref.weekStart, ref.weekEnd)}.` : undefined,
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
          {Array.isArray(c.body) ? (
            <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
              {c.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          )}
          {c.note ? <p className="mt-1.5 text-xs text-muted-foreground">{c.note}</p> : null}
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
