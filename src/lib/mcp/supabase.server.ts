/**
 * Cliente Supabase somente-servidor usado pelas ferramentas MCP.
 * Usa a chave publicável (respeita RLS) — nunca a service role.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function mcpSupabase() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export interface StationRow {
  id: string;
  name: string;
  city: string | null;
  rating: number;
  reliability_score: number;
  fillups_count: number;
  prices: Record<string, { price: number; confirmations: number; reported_at: string }>;
}

/** Postos com os preços mais recentes informados pela comunidade. */
export async function fetchStations(city?: string): Promise<StationRow[]> {
  const supabase = mcpSupabase();
  let query = supabase
    .from("stations")
    .select(
      "id, name, city, rating, reliability_score, fillups_count, station_prices(fuel_type_id, price, confirmations, reported_at)",
    )
    .order("rating", { ascending: false })
    .limit(50);
  if (city) query = query.ilike("city", `%${city}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((station) => ({
    id: station.id,
    name: station.name,
    city: station.city,
    rating: Number(station.rating),
    reliability_score: station.reliability_score,
    fillups_count: station.fillups_count,
    prices: Object.fromEntries(
      (station.station_prices ?? []).map((p) => [
        p.fuel_type_id,
        {
          price: Number(p.price),
          confirmations: p.confirmations,
          reported_at: p.reported_at,
        },
      ]),
    ),
  }));
}

export function emptyResult(message: string) {
  return { content: [{ type: "text" as const, text: message }] };
}
