import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_STALE_TIME } from "@/constants/app";
import {
  fuelingsRepository,
  profilesRepository,
  stationsRepository,
  statisticsRepository,
  vehiclesRepository,
  type FuelingDraft,
  type VehicleDraft,
} from "@/repositories";
import { computeFuelings, overview, savingsOpportunity } from "@/services/analytics";
import { buildInsights } from "@/services/insights";
import { useAuth } from "@/providers/AuthProvider";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/telemetry";
import { enqueueFueling, isNetworkError } from "@/lib/offline-queue";
import type { Fueling, Vehicle } from "@/types/domain";

export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  vehicles: (userId: string) => ["vehicles", userId] as const,
  fuelings: (userId: string) => ["fuelings", userId] as const,
  stations: (city: string | null) => ["stations", city ?? "all"] as const,
  userStats: (userId: string) => ["user-stats", userId] as const,
  vehicleStats: (vehicleId: string) => ["vehicle-stats", vehicleId] as const,
};

const base = {
  staleTime: QUERY_STALE_TIME,
  retry: 2,
  refetchOnWindowFocus: false,
} satisfies Partial<UseQueryOptions>;

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    ...base,
    queryKey: queryKeys.profile(userId),
    enabled: !!userId,
    queryFn: () =>
      profilesRepository.ensure(
        userId,
        (user?.user_metadata?.full_name as string) ?? (user?.user_metadata?.name as string) ?? null,
        (user?.user_metadata?.avatar_url as string) ?? null,
      ),
  });
}

export function useVehicles() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    ...base,
    queryKey: queryKeys.vehicles(userId),
    enabled: !!userId,
    queryFn: () => vehiclesRepository.list(userId),
  });
}

export function useFuelings() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    ...base,
    queryKey: queryKeys.fuelings(userId),
    enabled: !!userId,
    queryFn: () => fuelingsRepository.list(userId),
  });
}

export function useStations(city: string | null) {
  return useQuery({
    ...base,
    staleTime: 5 * 60_000,
    queryKey: queryKeys.stations(city),
    queryFn: () => stationsRepository.list(city),
  });
}

export function useVehicleStats(vehicleId: string | null) {
  return useQuery({
    ...base,
    queryKey: queryKeys.vehicleStats(vehicleId ?? ""),
    enabled: !!vehicleId,
    queryFn: () => statisticsRepository.vehicle(vehicleId as string),
  });
}

/* ------------------------------- mutations -------------------------------- */

function reportMutationError(scope: string) {
  return (error: Error) => {
    captureException(error, { scope });
    toast.error(error.message);
  };
}

export function useCreateVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, isPrimary }: { draft: VehicleDraft; isPrimary: boolean }) =>
      vehiclesRepository.create(user!.id, draft, isPrimary),
    onSuccess: (vehicle) => {
      client.invalidateQueries({ queryKey: queryKeys.vehicles(user?.id ?? "") });
      track("vehicle_created", { fuel_type: vehicle?.fuel_type_id ?? null });
      toast.success("Veículo salvo");
    },
    onError: reportMutationError("vehicle.create"),
  });
}

export function useUpdateVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Vehicle> }) =>
      vehiclesRepository.update(id, patch),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.vehicles(user?.id ?? "") });
      track("vehicle_updated");
      toast.success("Veículo atualizado");
    },
    onError: reportMutationError("vehicle.update"),
  });
}

export function useDeleteVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesRepository.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.vehicles(user?.id ?? "") });
      client.invalidateQueries({ queryKey: queryKeys.fuelings(user?.id ?? "") });
      track("vehicle_deleted");
      toast.success("Veículo removido");
    },
    onError: reportMutationError("vehicle.delete"),
  });
}

export function useCreateFueling() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      draft,
      computed,
    }: {
      draft: FuelingDraft;
      computed: { km_per_liter: number | null; cost_per_km: number | null };
    }): Promise<{ queued: boolean }> => {
      const userId = user!.id;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueFueling(userId, draft, computed);
        return { queued: true };
      }
      try {
        await fuelingsRepository.create(userId, draft, computed);
        return { queued: false };
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        enqueueFueling(userId, draft, computed);
        return { queued: true };
      }
    },
    onSuccess: (result, variables) => {
      const id = user?.id ?? "";
      client.invalidateQueries({ queryKey: queryKeys.fuelings(id) });
      client.invalidateQueries({ queryKey: queryKeys.vehicles(id) });
      client.invalidateQueries({ queryKey: ["vehicle-stats"] });

      if (result.queued) {
        track("fueling_queued_offline", { fuel_type: variables.draft.fuel_type_id });
        toast.info("Sem conexão: salvo no aparelho e enviaremos automaticamente.");
        return;
      }
      track("fueling_created", {
        fuel_type: variables.draft.fuel_type_id,
        liters: variables.draft.liters,
        total_cost: variables.draft.total_cost,
        full_tank: variables.draft.full_tank,
      });
    },
    onError: reportMutationError("fueling.create"),
  });
}

export function useUpdateFueling() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Fueling> }) =>
      fuelingsRepository.update(id, patch),
    onSuccess: () => {
      const id = user?.id ?? "";
      client.invalidateQueries({ queryKey: queryKeys.fuelings(id) });
      client.invalidateQueries({ queryKey: queryKeys.vehicles(id) });
      client.invalidateQueries({ queryKey: ["vehicle-stats"] });
      track("fueling_updated");
      toast.success("Abastecimento atualizado");
    },
    onError: reportMutationError("fueling.update"),
  });
}

export function useDeleteFueling() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fuelingsRepository.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.fuelings(user?.id ?? "") });
      client.invalidateQueries({ queryKey: ["vehicle-stats"] });
      track("fueling_deleted");
      toast.success("Abastecimento removido");
    },
    onError: reportMutationError("fueling.delete"),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof profilesRepository.update>[1]) =>
      profilesRepository.update(user!.id, patch),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.profile(user?.id ?? "") });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/* -------------------------------- derived --------------------------------- */

/** Reúne abastecimentos, veículo principal, postos e insights numa visão única. */
export function useHomeData() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const fuelings = useFuelings();
  const primary = vehicles.data?.find((v) => v.is_primary) ?? vehicles.data?.[0] ?? null;
  const stations = useStations(profile.data?.city ?? null);

  const rows = computeFuelings((fuelings.data ?? []) as Fueling[]);
  const stats = overview(rows);
  const savings = savingsOpportunity(
    rows,
    stations.data ?? [],
    primary?.fuel_type_id ?? null,
    primary?.tank_liters ?? null,
  );
  const insights = buildInsights(stats, savings);

  return {
    isLoading: profile.isLoading || vehicles.isLoading || fuelings.isLoading,
    profile: profile.data ?? null,
    vehicles: vehicles.data ?? [],
    primaryVehicle: primary,
    rows,
    stats,
    savings,
    insights,
    stations: stations.data ?? [],
  };
}
