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

export function useCreateVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, isPrimary }: { draft: VehicleDraft; isPrimary: boolean }) =>
      vehiclesRepository.create(user!.id, draft, isPrimary),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.vehicles(user?.id ?? "") });
      toast.success("Veículo salvo");
    },
    onError: (error: Error) => toast.error(error.message),
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
      toast.success("Veículo atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
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
      toast.success("Veículo removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCreateFueling() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      draft,
      computed,
    }: {
      draft: FuelingDraft;
      computed: { km_per_liter: number | null; cost_per_km: number | null };
    }) => fuelingsRepository.create(user!.id, draft, computed),
    onSuccess: () => {
      const id = user?.id ?? "";
      client.invalidateQueries({ queryKey: queryKeys.fuelings(id) });
      client.invalidateQueries({ queryKey: queryKeys.vehicles(id) });
      client.invalidateQueries({ queryKey: ["vehicle-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
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
      toast.success("Abastecimento removido");
    },
    onError: (error: Error) => toast.error(error.message),
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
