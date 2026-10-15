-- Alerta do scanner do Lovable: políticas SELECT com USING (true).
--
-- Catálogos públicos sem dado pessoal continuam abertos de propósito:
--   fuel_types, badges, missions, stations, station_prices, price_history, clubs.
-- Tabelas que ligam uma pessoa (user_id) a uma ação passam a ser lidas só pela própria
-- pessoa, enquanto a comunidade estiver desligada. Quando ela abrir, trocar por views
-- agregadas (contagens, médias) em vez de liberar as linhas.

-- Avaliações de posto
DROP POLICY IF EXISTS "reviews readable" ON public.station_reviews;
DROP POLICY IF EXISTS "reviews read own" ON public.station_reviews;
CREATE POLICY "reviews read own" ON public.station_reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Fotos de posto
DROP POLICY IF EXISTS "station photos readable" ON public.station_photos;
DROP POLICY IF EXISTS "station photos read own" ON public.station_photos;
CREATE POLICY "station photos read own" ON public.station_photos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Curtidas
DROP POLICY IF EXISTS "likes readable" ON public.likes;
DROP POLICY IF EXISTS "likes read own" ON public.likes;
CREATE POLICY "likes read own" ON public.likes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Conquistas do usuário
DROP POLICY IF EXISTS "user badges readable" ON public.user_badges;
DROP POLICY IF EXISTS "user badges read own" ON public.user_badges;
CREATE POLICY "user badges read own" ON public.user_badges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE SELECT ON public.station_reviews, public.station_photos, public.likes, public.user_badges
  FROM anon;

-- Postos e clubes continuam públicos, mas sem revelar quem cadastrou (created_by).
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
