DROP POLICY IF EXISTS "club members readable" ON public.club_members;
DROP POLICY IF EXISTS "followers readable" ON public.followers;

REVOKE SELECT ON public.station_prices FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type_id, price, confirmations, reported_at, updated_at)
  ON public.station_prices TO anon, authenticated;

REVOKE SELECT ON public.price_history FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type_id, price, created_at)
  ON public.price_history TO anon, authenticated;

GRANT ALL ON public.station_prices TO service_role;
GRANT ALL ON public.price_history TO service_role;