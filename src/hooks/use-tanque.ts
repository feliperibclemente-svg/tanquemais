import { useServerFn } from "@tanstack/react-start";
import { listMunicipios } from "@/lib/municipios.functions";
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { friendlyError } from "@/lib/user-error";
import { QUERY_STALE_TIME } from "@/constants/app";
import {
  fuelingsRepository,
  profilesRepository,
  statisticsRepository,
  vehiclesRepository,
  type FuelingDraft,
  type VehicleDraft,
} from "@/repositories";
import { computeFuelings, overview, savingsOpportunity } from "@/services/analytics";
import { buildInsights } from "@/services/insights";
import { chooseReference, normalizeName, toUf, type PriceReferenceRow } from "@/services/anp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/telemetry";
import { enqueueFueling, isNetworkError } from "@/lib/offline-queue";
import type { Fueling, Vehicle } from "@/types/domain";

export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  vehicles: (userId: string) => ["vehicles", userId] as const,
  fuelings: (userId: string) => ["fuelings", userId] as const,
  userStats: (userId: string) => ["user-stats", userId] as const,
  vehicleStats: (vehicleId: string) => ["vehicle-stats", vehicleId] as const,
  priceReferences: (uf: string, city: string) => ["price-references", uf, city] as const,
  checkups: (userId: string) => ["checkups", userId] as const,
};

/**
 * Médias semanais da ANP para a cidade e o estado do perfil (últimos 60 dias).
 * Dado público; sem cidade/UF no perfil não há consulta.
 */
/**
 * Médias por cidade da semana mais recente da ANP para um combustível
 * (no estado informado, ou no Brasil todo). Dado público.
 */
export function useCityPrices(fuelTypeId: string, uf: string | null) {
  return useQuery({
    ...base,
    staleTime: 6 * 60 * 60_000,
    retry: 1,
    queryKey: ["city-prices", fuelTypeId, uf ?? "BR"],
    queryFn: async () => {
      const latest = await supabase
        .from("fuel_price_references")
        .select("week_start, week_end")
        .eq("scope", "municipio")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) throw latest.error;
      if (!latest.data) return { week: null, rows: [] };
      let query = supabase
        .from("fuel_price_references")
        .select("uf, municipio, municipio_label, avg_price, stations")
        .eq("scope", "municipio")
        .eq("week_start", latest.data.week_start)
        .eq("fuel_type_id", fuelTypeId)
        .limit(2000);
      if (uf) query = query.eq("uf", uf);
      const { data, error } = await query;
      if (error) throw error;
      return {
        week: { start: latest.data.week_start, end: latest.data.week_end },
        rows: (data ?? []) as Pick<
          PriceReferenceRow,
          "uf" | "municipio" | "municipio_label" | "avg_price" | "stations"
        >[],
      };
    },
  });
}

/** Nomes das cidades pesquisadas pela ANP num estado (sugestões ao digitar a cidade). */
export function useAnpCities(uf: string | null) {
  return useQuery({
    ...base,
    staleTime: 24 * 60 * 60_000,
    retry: 1,
    enabled: !!uf,
    queryKey: ["anp-cities", uf ?? ""],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_price_references")
        .select("municipio_label")
        .eq("scope", "municipio")
        .eq("uf", uf!)
        .eq("fuel_type_id", "gasolina")
        .order("week_start", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return [
        ...new Set((data ?? []).map((r) => r.municipio_label).filter(Boolean) as string[]),
      ].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
}

/**
 * Lista de cidades da UF para o campo de cidade: a do IBGE (completa); se o IBGE não
 * responder, as cidades da pesquisa da ANP. Nunca impede digitar outra.
 */
export function useCityList(uf: string | null) {
  const fetchIbge = useServerFn(listMunicipios);
  const anp = useAnpCities(uf);
  const ibge = useQuery({
    ...base,
    staleTime: 7 * 24 * 60 * 60_000,
    retry: 1,
    enabled: !!uf,
    queryKey: ["ibge-cities", uf ?? ""],
    queryFn: () => fetchIbge({ data: { uf: uf! } }),
  });
  const list = ibge.data?.length ? ibge.data : (anp.data ?? []);
  return { list, complete: !!ibge.data?.length, isLoading: ibge.isLoading };
}

export function usePriceReferences(place: { uf: string | null; city: string | null }) {
  const uf = toUf(place.uf ?? "") ?? "";
  const city = normalizeName(place.city);
  return useQuery({
    ...base,
    staleTime: 6 * 60 * 60_000,
    retry: 1,
    enabled: !!uf,
    queryKey: queryKeys.priceReferences(uf, city),
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("fuel_price_references")
        .select(
          "scope, uf, municipio, municipio_label, fuel_type_id, avg_price, min_price, max_price, week_start, week_end, stations",
        )
        .eq("uf", uf)
        .in("municipio", city ? ["", city] : [""])
        .gte("week_start", since)
        .order("week_start", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []) as Pick<
        PriceReferenceRow,
        | "scope"
        | "uf"
        | "municipio"
        | "municipio_label"
        | "fuel_type_id"
        | "avg_price"
        | "week_start"
        | "week_end"
        | "stations"
        | "min_price"
        | "max_price"
      >[];
    },
  });
}

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

export interface CheckupRecord {
  id: string;
  vehicle_id: string;
  findings: string[];
  created_at: string;
}

/** Últimos check-ups da pessoa (mais recente primeiro). */
export function useCheckups() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    ...base,
    queryKey: queryKeys.checkups(userId),
    enabled: !!userId,
    queryFn: async (): Promise<CheckupRecord[]> => {
      const { data, error } = await supabase
        .from("vehicle_checkups")
        .select("id, vehicle_id, findings, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Grava o check-up e, se informada, a troca de óleo do veículo. Sem aviso na tela. */
export function useSaveCheckup() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (o: {
      vehicleId: string;
      answers: Record<string, string>;
      findings: string[];
      odometer: number | null;
      oil: { km: number | null; intervalKm: number | null } | null;
    }) => {
      if (o.oil) {
        const { error } = await supabase
          .from("vehicles")
          .update({ oil_change_km: o.oil.km, oil_change_interval_km: o.oil.intervalKm })
          .eq("id", o.vehicleId);
        if (error) throw error;
      }
      const { error } = await supabase.from("vehicle_checkups").insert({
        vehicle_id: o.vehicleId,
        answers: o.answers,
        findings: o.findings,
        odometer: o.odometer,
      });
      if (error) throw error;
    },
    onSuccess: (_, o) => {
      client.invalidateQueries({ queryKey: queryKeys.checkups(user?.id ?? "") });
      if (o.oil) client.invalidateQueries({ queryKey: queryKeys.vehicles(user?.id ?? "") });
      track("checkup_completed", { findings: o.findings.length });
    },
    onError: (error: Error) => captureException(error, { scope: "checkup.save" }),
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
    toast.error(friendlyError(error));
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

/** Favorita um veículo como principal (troca atômica no banco). */
export function useSetPrimaryVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesRepository.setPrimary(user!.id, id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.vehicles(user?.id ?? "") });
      track("vehicle_set_primary");
      toast.success("Veículo principal atualizado");
    },
    onError: reportMutationError("vehicle.set_primary"),
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
        full_tank: variables.draft.full_tank,
        station: !!variables.draft.station_name?.trim(),
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
    onError: (error: Error) => toast.error(friendlyError(error)),
  });
}

/* -------------------------------- derived --------------------------------- */

/** Reúne abastecimentos, veículo principal, postos e insights numa visão única. */
export function useHomeData() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const fuelings = useFuelings();
  const primary = vehicles.data?.find((v) => v.is_primary) ?? vehicles.data?.[0] ?? null;

  // Home, Painel e Perfil mostram só o veículo principal.
  const rows = computeFuelings(
    ((fuelings.data ?? []) as Fueling[]).filter((f) => !primary || f.vehicle_id === primary.id),
    vehicles.data ?? [],
  );
  const stats = overview(rows);
  const place = { uf: profile.data?.state ?? null, city: profile.data?.city ?? null };
  const references = usePriceReferences(place);
  const lastReference =
    stats.last && references.data
      ? chooseReference(references.data, place, stats.last.fuel_type_id, stats.last.filled_at)
      : null;
  const savings = savingsOpportunity(
    rows,
    [],
    primary?.fuel_type_id ?? null,
    primary?.tank_liters ?? null,
  );
  const insights = buildInsights(
    stats,
    savings,
    lastReference && stats.last
      ? { reference: lastReference, paid: Number(stats.last.price_per_liter) }
      : null,
  );

  return {
    isLoading: profile.isLoading || vehicles.isLoading || fuelings.isLoading,
    isError: vehicles.isError || fuelings.isError,
    refetch: () => {
      void vehicles.refetch();
      void fuelings.refetch();
    },
    profile: profile.data ?? null,
    vehicles: vehicles.data ?? [],
    primaryVehicle: primary,
    rows,
    stats,
    savings,
    insights,
    place,
    hasPlace: !!toUf(place.uf ?? ""),
    references: references.data ?? [],
    lastReference,
  };
}
