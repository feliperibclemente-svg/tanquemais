import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Vehicle = Tables<"vehicles">;
export type Fueling = Tables<"fuelings">;
export type Station = Tables<"stations">;
export type StationPrice = Tables<"station_prices">;
export type PriceHistory = Tables<"price_history">;
export type Club = Tables<"clubs">;
export type Post = Tables<"posts">;
export type Badge = Tables<"badges">;
export type Mission = Tables<"missions">;
export type MissionProgress = Tables<"mission_progress">;
export type AiInsight = Tables<"ai_insights">;
export type Notification = Tables<"notifications">;
export type UserStatistics = Tables<"user_statistics">;
export type VehicleStatistics = Tables<"vehicle_statistics">;

export type StationWithPrices = Station & {
  station_prices: StationPrice[];
  distance_km?: number;
};

export type FuelingWithRelations = Fueling & {
  stations: Pick<Station, "id" | "name" | "brand" | "city"> | null;
};

export type PostWithRelations = Post & {
  profiles: Pick<Profile, "id" | "username" | "full_name" | "avatar_url" | "level"> | null;
  stations: Pick<Station, "id" | "name" | "brand" | "city"> | null;
  likes: { user_id: string }[];
};

export type InsightSeverity = "info" | "good" | "warning";

export type Insight = {
  id: string;
  icon: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  savings?: number | null;
  action?: { label: string; to: string } | null;
};
