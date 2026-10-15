-- Complemento ao drizzle 0003 (Lovable), que já restringiu a leitura de likes,
-- user_badges, station_reviews e station_photos ao próprio dono.
--
-- Faltava: postos e clubes continuam públicos (catálogo), mas não devem revelar quem
-- os cadastrou. created_by fica fora do SELECT de anon e authenticated.

REVOKE SELECT ON public.station_reviews, public.station_photos, public.likes, public.user_badges
  FROM anon;

REVOKE SELECT ON public.stations FROM anon, authenticated;
GRANT SELECT (
  id, name, brand, address, city, state, latitude, longitude, is_24h, has_convenience,
  rating, reviews_count, fillups_count, reliability_score, created_at, updated_at
) ON public.stations TO anon, authenticated;

REVOKE SELECT ON public.clubs FROM anon, authenticated;
GRANT SELECT (
  id, slug, name, description, kind, city, cover_url, members_count, created_at
) ON public.clubs TO anon, authenticated;

GRANT ALL ON public.stations, public.clubs TO service_role;
