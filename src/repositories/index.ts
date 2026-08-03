import { supabase } from "@/integrations/supabase/client";
import type {
  Profile,
  Vehicle,
  Fueling,
  Station,
  UserStatistics,
  VehicleStatistics,
} from "@/types/domain";
import { unwrap, unwrapMaybe } from "./base";

/* ------------------------------- profiles -------------------------------- */

export const profilesRepository = {
  async get(userId: string): Promise<Profile | null> {
    return unwrapMaybe(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
  },

  async ensure(
    userId: string,
    fullName?: string | null,
    avatarUrl?: string | null,
  ): Promise<Profile> {
    const existing = await this.get(userId);
    if (existing) return existing;
    return unwrap(
      await supabase
        .from("profiles")
        .insert({ id: userId, full_name: fullName ?? null, avatar_url: avatarUrl ?? null })
        .select("*")
        .single(),
    );
  },

  async update(userId: string, patch: Partial<Profile>): Promise<Profile> {
    return unwrap(
      await supabase.from("profiles").update(patch).eq("id", userId).select("*").single(),
    );
  },
};

/* ------------------------------- vehicles -------------------------------- */

export type VehicleDraft = {
  brand: string;
  model: string;
  year?: number | null;
  engine?: string | null;
  nickname?: string | null;
  plate?: string | null;
  color?: string | null;
  fuel_type_id?: string | null;
  tank_liters?: number | null;
  current_odometer: number;
};

export const vehiclesRepository = {
  async list(userId: string): Promise<Vehicle[]> {
    return (
      unwrap(
        await supabase
          .from("vehicles")
          .select("*")
          .eq("user_id", userId)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true }),
      ) ?? []
    );
  },

  async create(userId: string, draft: VehicleDraft, isPrimary: boolean): Promise<Vehicle> {
    return unwrap(
      await supabase
        .from("vehicles")
        .insert({
          user_id: userId,
          brand: draft.brand,
          model: draft.model,
          year: draft.year ?? null,
          engine: draft.engine || null,
          nickname: draft.nickname || null,
          plate: draft.plate || null,
          color: draft.color || null,
          fuel_type_id: draft.fuel_type_id || null,
          tank_liters: draft.tank_liters ?? null,
          initial_odometer: draft.current_odometer,
          current_odometer: draft.current_odometer,
          is_primary: isPrimary,
        })
        .select("*")
        .single(),
    );
  },

  async update(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
    return unwrap(await supabase.from("vehicles").update(patch).eq("id", id).select("*").single());
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) throw error;
  },

  async setPrimary(userId: string, id: string): Promise<void> {
    await supabase.from("vehicles").update({ is_primary: false }).eq("user_id", userId);
    await supabase.from("vehicles").update({ is_primary: true }).eq("id", id);
  },
};

/* ------------------------------- fuelings -------------------------------- */

export type FuelingDraft = {
  vehicle_id: string;
  station_id?: string | null;
  fuel_type_id: string;
  filled_at: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer: number;
  full_tank: boolean;
  note?: string | null;
};

export const fuelingsRepository = {
  async list(userId: string, limit = 200): Promise<Fueling[]> {
    return (
      unwrap(
        await supabase
          .from("fuelings")
          .select("*")
          .eq("user_id", userId)
          .order("filled_at", { ascending: false })
          .limit(limit),
      ) ?? []
    );
  },

  async create(
    userId: string,
    draft: FuelingDraft,
    computed: { km_per_liter: number | null; cost_per_km: number | null },
  ): Promise<Fueling> {
    return unwrap(
      await supabase
        .from("fuelings")
        .insert({
          user_id: userId,
          vehicle_id: draft.vehicle_id,
          station_id: draft.station_id ?? null,
          fuel_type_id: draft.fuel_type_id,
          filled_at: draft.filled_at,
          liters: draft.liters,
          price_per_liter: draft.price_per_liter,
          total_cost: draft.total_cost,
          odometer: draft.odometer,
          full_tank: draft.full_tank,
          note: draft.note || null,
          km_per_liter: computed.km_per_liter,
          cost_per_km: computed.cost_per_km,
        })
        .select("*")
        .single(),
    );
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("fuelings").delete().eq("id", id);
    if (error) throw error;
  },
};

/* ------------------------------- stations -------------------------------- */

export type StationWithPrice = Station & {
  station_prices: {
    fuel_type_id: string;
    price: number;
    confirmations: number;
    reported_at: string;
  }[];
};

export const stationsRepository = {
  async list(city?: string | null): Promise<StationWithPrice[]> {
    let query = supabase
      .from("stations")
      .select("*, station_prices(fuel_type_id, price, confirmations, reported_at)")
      .order("rating", { ascending: false })
      .limit(40);
    if (city) query = query.eq("city", city);
    return (unwrap(await query) as StationWithPrice[]) ?? [];
  },
};

/* ------------------------------ statistics -------------------------------- */

export const statisticsRepository = {
  async user(userId: string): Promise<UserStatistics | null> {
    return unwrapMaybe(
      await supabase.from("user_statistics").select("*").eq("user_id", userId).maybeSingle(),
    );
  },

  async vehicle(vehicleId: string): Promise<VehicleStatistics | null> {
    return unwrapMaybe(
      await supabase
        .from("vehicle_statistics")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .maybeSingle(),
    );
  },
};

/* -------------------------------- feedback -------------------------------- */

export type FeedbackKind = "problema" | "sugestao" | "elogio";

export interface FeedbackDraft {
  kind: FeedbackKind;
  rating: number | null;
  message: string;
  page?: string | null;
}

export const feedbackRepository = {
  async create(userId: string, draft: FeedbackDraft) {
    return unwrap(
      await supabase
        .from("feedback")
        .insert({
          user_id: userId,
          kind: draft.kind,
          rating: draft.rating,
          message: draft.message.trim(),
          page: draft.page ?? null,
          app_version: "beta",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
        })
        .select("id, created_at")
        .single(),
    );
  },

  async listMine(userId: string) {
    return (
      unwrap(
        await supabase
          .from("feedback")
          .select("id, kind, rating, message, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ) ?? []
    );
  },
};
