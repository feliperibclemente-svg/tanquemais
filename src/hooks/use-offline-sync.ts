import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fuelingsRepository } from "@/repositories";
import { flushQueue, queuedFuelings, subscribeQueue, type QueuedFueling } from "@/lib/offline-queue";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/telemetry";
import { queryKeys } from "@/hooks/use-tanque";
import { useAuth } from "@/providers/AuthProvider";

const RETRY_INTERVAL = 30_000;

/**
 * Mantém a fila offline sincronizada: tenta enviar ao montar, quando a rede
 * volta e periodicamente enquanto houver pendências.
 */
export function useOfflineSync() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [pending, setPending] = useState<QueuedFueling[]>([]);

  useEffect(() => {
    setPending(queuedFuelings());
    return subscribeQueue(setPending);
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const sync = async () => {
      if (cancelled) return;
      const synced = await flushQueue((item) =>
        fuelingsRepository.create(item.userId, item.draft, item.computed),
      );
      if (cancelled || synced === 0) return;

      logger.info("offline.fueling.synced", { count: synced });
      track("fueling_synced", { count: synced });
      client.invalidateQueries({ queryKey: queryKeys.fuelings(user.id) });
      client.invalidateQueries({ queryKey: queryKeys.vehicles(user.id) });
      client.invalidateQueries({ queryKey: ["vehicle-stats"] });
      toast.success(
        synced === 1
          ? "1 abastecimento sincronizado"
          : `${synced} abastecimentos sincronizados`,
      );
    };

    void sync();
    window.addEventListener("online", sync);
    const timer = window.setInterval(() => {
      if (queuedFuelings().length > 0) void sync();
    }, RETRY_INTERVAL);

    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      window.clearInterval(timer);
    };
  }, [user, client]);

  return { pending, pendingCount: pending.length };
}
