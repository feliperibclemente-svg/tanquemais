import { useMemo } from "react";
import { useHomeData } from "@/hooks/use-tanque";
import { vehicleKind } from "@/constants/vehicles";
import { buildMonthlyRecap, recapMonthFor, type MonthlyRecap } from "@/services/recap";

const SEEN = (key: string) => `tanque:recap-seen:${key}`;

export function recapSeen(key: string): boolean {
  try {
    return localStorage.getItem(SEEN(key)) === "1";
  } catch {
    return false;
  }
}

export function markRecapSeen(key: string) {
  try {
    localStorage.setItem(SEEN(key), "1");
  } catch {
    /* sem armazenamento: o cartão pode aparecer de novo */
  }
}

/** Retrospectiva do mês do veículo principal (null quando ainda não há o que mostrar). */
export function useMonthlyRecap(): { recap: MonthlyRecap | null; isLoading: boolean } {
  const { rows, primaryVehicle, references, place, isLoading } = useHomeData();
  const recap = useMemo(() => {
    if (!primaryVehicle) return null;
    const month = recapMonthFor(rows);
    if (!month) return null;
    const name = primaryVehicle.nickname || primaryVehicle.model || "veículo";
    const your = vehicleKind(primaryVehicle.brand) === "moto" ? `Sua ${name}` : `Seu ${name}`;
    return buildMonthlyRecap({
      rows,
      key: month.key,
      partial: month.partial,
      vehicleYour: your,
      references: references ?? [],
      place,
    });
  }, [rows, primaryVehicle, references, place]);
  return { recap, isLoading };
}
