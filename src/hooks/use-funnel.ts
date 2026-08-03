/**
 * Funil de ativação do beta: instalação → cadastro → veículo → 1º abastecimento
 * → retenção. Os marcos são derivados do banco (fonte de verdade) e enviados
 * uma única vez por usuário.
 */
import { useEffect } from "react";
import { track, trackOnce, trackRetention } from "@/lib/analytics";
import { useAuth } from "@/providers/AuthProvider";
import { useFuelings, useVehicles } from "@/hooks/use-tanque";

export function useFunnelTracking() {
  const { user } = useAuth();
  const vehicles = useVehicles();
  const fuelings = useFuelings();

  const userId = user?.id;
  const vehicleCount = vehicles.data?.length ?? 0;
  const fuelingCount = fuelings.data?.length ?? 0;
  const ready = vehicles.isSuccess && fuelings.isSuccess;

  useEffect(() => {
    if (!userId) return;
    track("app_opened");
    trackRetention(userId);
    trackOnce("funnel_signup_completed", userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || !ready) return;
    if (vehicleCount > 0) trackOnce("funnel_vehicle_added", userId, { vehicles: vehicleCount });
    if (fuelingCount > 0) {
      trackOnce("funnel_first_fueling", userId);
      trackOnce("funnel_activated", userId);
    }
  }, [userId, ready, vehicleCount, fuelingCount]);
}
