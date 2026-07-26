import { useCallback, useEffect, useState } from "react";

/* =========================================================================
 * Tanque+ — modelo de dados
 * Arquitetura preparada para evoluir: cada "módulo" (abastecimento, manutenção,
 * IPVA, seguro, pneus) vive em uma chave própria do storage e usa o mesmo
 * padrão de repositório abaixo. Trocar o storage local por Lovable Cloud
 * significa apenas reimplementar `load`/`save`.
 * ========================================================================= */

export type FuelType = "gasolina" | "etanol" | "diesel";

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: string;
  engine: string;
  fuel: string;
  transmission: string;
  odometer: number;
}

export interface Fillup {
  id: string;
  vehicleId: string;
  date: string;
  amountPaid: number;
  pricePerLiter: number;
  liters: number;
  odometer: number;
  fuel: FuelType;
  station?: string;
}

export interface Profile {
  name: string;
  onboarded: boolean;
}

export interface Station {
  id: string;
  name: string;
  gasoline: number;
  ethanol: number;
  distanceKm: number;
  hours: string;
  rating: number;
  reviews: number;
  scores: { atendimento: number; qualidade: number; limpeza: number; espera: number };
}

/* ---------------------------------- store -------------------------------- */

const KEYS = {
  profile: "tanque:profile",
  vehicles: "tanque:vehicles",
  fillups: "tanque:fillups",
  theme: "tanque:theme",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("tanque:change", { detail: key }));
}

export function usePersisted<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setReady(true);
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === key) setValue(read<T>(key, fallback));
    };
    window.addEventListener("tanque:change", onChange);
    return () => window.removeEventListener("tanque:change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      write(key, next);
    },
    [key],
  );

  return { value, setValue: update, ready };
}

export const useProfile = () =>
  usePersisted<Profile>(KEYS.profile, { name: "", onboarded: false });
export const useVehicles = () => usePersisted<Vehicle[]>(KEYS.vehicles, []);
export const useFillups = () => usePersisted<Fillup[]>(KEYS.fillups, []);
export const THEME_KEY = KEYS.theme;

export const uid = () => Math.random().toString(36).slice(2, 10);

/* -------------------------------- formatação ----------------------------- */

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

/* -------------------------------- cálculos ------------------------------- */

export interface FillupStats extends Fillup {
  distance?: number;
  kmPerLiter?: number;
  costPerKm?: number;
}

export function withStats(fillups: Fillup[]): FillupStats[] {
  const sorted = [...fillups].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return sorted
    .map((f, i) => {
      const prev = sorted[i - 1];
      if (!prev || f.odometer <= prev.odometer) return { ...f };
      const distance = f.odometer - prev.odometer;
      const kmPerLiter = distance / f.liters;
      return { ...f, distance, kmPerLiter, costPerKm: f.amountPaid / distance };
    })
    .reverse();
}

export function summary(fillups: Fillup[]) {
  const stats = withStats(fillups);
  const now = new Date();
  const inMonth = stats.filter((f) => {
    const d = new Date(f.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthSpend = inMonth.reduce((s, f) => s + f.amountPaid, 0);
  const totalSpend = stats.reduce((s, f) => s + f.amountPaid, 0);
  const withDistance = stats.filter((f) => f.distance);
  const km = withDistance.reduce((s, f) => s + (f.distance ?? 0), 0);
  const liters = withDistance.reduce((s, f) => s + f.liters, 0);
  const avg = liters ? km / liters : 0;
  const costPerKm = km ? withDistance.reduce((s, f) => s + f.amountPaid, 0) / km : 0;

  const prices = stats.map((f) => f.pricePerLiter);
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const savings = stats.reduce((s, f) => s + (f.pricePerLiter - cheapest) * f.liters, 0);

  const ranked = [...withDistance].sort((a, b) => (b.kmPerLiter ?? 0) - (a.kmPerLiter ?? 0));

  return {
    stats,
    monthSpend,
    totalSpend,
    km,
    liters,
    avg,
    costPerKm,
    savings,
    best: ranked[0],
    worst: ranked[ranked.length - 1],
    last: stats[0],
  };
}

export function monthlySeries(fillups: Fillup[]) {
  const stats = withStats(fillups);
  const map = new Map<string, { month: string; gasto: number; litros: number; kml: number[] }>();
  for (const f of [...stats].reverse()) {
    const key = f.date.slice(0, 7);
    const entry = map.get(key) ?? { month: monthLabel(f.date), gasto: 0, litros: 0, kml: [] };
    entry.gasto += f.amountPaid;
    entry.litros += f.liters;
    if (f.kmPerLiter) entry.kml.push(f.kmPerLiter);
    map.set(key, entry);
  }
  return [...map.values()].map((e) => ({
    month: e.month,
    gasto: Number(e.gasto.toFixed(2)),
    litros: Number(e.litros.toFixed(1)),
    consumo: e.kml.length ? Number((e.kml.reduce((a, b) => a + b, 0) / e.kml.length).toFixed(2)) : 0,
  }));
}

export function fuelComparison(fillups: Fillup[]) {
  const stats = withStats(fillups).filter((f) => f.kmPerLiter);
  const byFuel = (fuel: FuelType) => {
    const rows = stats.filter((f) => f.fuel === fuel);
    if (!rows.length) return null;
    return {
      fuel,
      consumo: rows.reduce((s, f) => s + (f.kmPerLiter ?? 0), 0) / rows.length,
      custoKm: rows.reduce((s, f) => s + (f.costPerKm ?? 0), 0) / rows.length,
    };
  };
  return (["gasolina", "etanol", "diesel"] as FuelType[])
    .map(byFuel)
    .filter(Boolean) as { fuel: FuelType; consumo: number; custoKm: number }[];
}

/* --------------------------------- TanqueIA ------------------------------- */

export function tanqueIA(fillups: Fillup[]): string[] {
  const s = summary(fillups);
  const out: string[] = [];
  if (fillups.length < 2) {
    out.push("Registre ao menos dois abastecimentos para eu calcular o rendimento real do seu carro.");
    return out;
  }
  const months = monthlySeries(fillups);
  if (months.length >= 2) {
    const a = months[months.length - 2].consumo;
    const b = months[months.length - 1].consumo;
    if (a && b) {
      const diff = ((b - a) / a) * 100;
      out.push(
        diff >= 0
          ? `Seu consumo melhorou ${num(Math.abs(diff))}% em relação ao mês passado.`
          : `Seu consumo caiu ${num(Math.abs(diff))}% em relação ao mês passado.`,
      );
    }
  }
  const cmp = fuelComparison(fillups);
  if (cmp.length >= 2) {
    const best = [...cmp].sort((a, b) => a.custoKm - b.custoKm)[0];
    out.push(`Seu carro rende melhor com ${best.fuel} (${brl(best.custoKm)} por km).`);
  }
  if (s.savings > 0)
    out.push(
      `Você poderia economizar cerca de ${brl(s.savings)} abastecendo sempre no menor preço que já encontrou.`,
    );
  if (s.costPerKm)
    out.push(`Seu custo por quilômetro é ${brl(s.costPerKm)} — acompanhe para mantê-lo baixo.`);
  return out;
}

/* ------------------------------ postos (demo) ----------------------------- */

export const STATIONS: Station[] = [
  {
    id: "1",
    name: "Posto Ipiranga Centro",
    gasoline: 5.69,
    ethanol: 3.79,
    distanceKm: 0.8,
    hours: "24 horas",
    rating: 4.7,
    reviews: 312,
    scores: { atendimento: 4.8, qualidade: 4.9, limpeza: 4.6, espera: 4.4 },
  },
  {
    id: "2",
    name: "Shell Av. Brasil",
    gasoline: 5.79,
    ethanol: 3.89,
    distanceKm: 1.4,
    hours: "06h – 23h",
    rating: 4.5,
    reviews: 208,
    scores: { atendimento: 4.5, qualidade: 4.7, limpeza: 4.5, espera: 4.2 },
  },
  {
    id: "3",
    name: "Petrobras Rodovia Norte",
    gasoline: 5.84,
    ethanol: 3.94,
    distanceKm: 2.6,
    hours: "24 horas",
    rating: 4.2,
    reviews: 96,
    scores: { atendimento: 4.1, qualidade: 4.4, limpeza: 4.0, espera: 4.3 },
  },
  {
    id: "4",
    name: "Posto Vale Alto",
    gasoline: 5.92,
    ethanol: 4.05,
    distanceKm: 3.1,
    hours: "05h – 22h",
    rating: 3.9,
    reviews: 54,
    scores: { atendimento: 3.8, qualidade: 4.1, limpeza: 3.7, espera: 4.0 },
  },
];
