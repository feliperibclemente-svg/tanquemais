-- =====================================================================
-- Tanque+ — banco completo para um projeto Supabase novo
-- Gerado a partir de supabase/migrations (2026-07 a 2026-09) + drizzle/migrations
-- (0000 a 0004), na ordem em que foram aplicados no Lovable Cloud.
-- Como usar: Supabase → SQL Editor → New query → colar tudo → Run. Rodar UMA vez.
-- =====================================================================


-- ---------------------------------------------------------------------
-- supabase/migrations/20260727123820_bacd4190-ecf8-4d2a-9ade-1d7a9efd8e87.sql
-- ---------------------------------------------------------------------

-- ============ EXTENSIONS / HELPERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  state text,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','friends','private')),
  hide_odometer boolean NOT NULL DEFAULT false,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public profiles readable" ON public.profiles FOR SELECT USING (visibility = 'public' OR auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_profiles_city ON public.profiles(city);

-- ============ FUEL TYPES ============
CREATE TABLE public.fuel_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'L',
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.fuel_types TO anon, authenticated;
GRANT ALL ON public.fuel_types TO service_role;
ALTER TABLE public.fuel_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fuel types readable" ON public.fuel_types FOR SELECT USING (true);
INSERT INTO public.fuel_types (id,label,unit,sort_order) VALUES
  ('gasolina','Gasolina comum','L',1),
  ('gasolina_aditivada','Gasolina aditivada','L',2),
  ('etanol','Etanol','L',3),
  ('diesel','Diesel S10','L',4),
  ('gnv','GNV','m³',5);

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text,
  brand text NOT NULL,
  model text NOT NULL,
  year integer,
  engine text,
  plate text,
  color text,
  photo_url text,
  fuel_type_id text REFERENCES public.fuel_types(id),
  tank_liters numeric(6,2),
  initial_odometer numeric(10,1) NOT NULL DEFAULT 0,
  current_odometer numeric(10,1) NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vehicles" ON public.vehicles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_vehicles_user ON public.vehicles(user_id);

-- ============ STATIONS ============
CREATE TABLE public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  address text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  is_24h boolean NOT NULL DEFAULT false,
  has_convenience boolean NOT NULL DEFAULT false,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  fillups_count integer NOT NULL DEFAULT 0,
  reliability_score integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stations TO anon;
GRANT SELECT, INSERT, UPDATE ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations readable" ON public.stations FOR SELECT USING (true);
CREATE POLICY "stations insert by users" ON public.stations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "stations update by owner or admin" ON public.stations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE TRIGGER trg_stations_updated BEFORE UPDATE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_stations_city ON public.stations(city);
CREATE INDEX idx_stations_geo ON public.stations(latitude, longitude);

-- ============ STATION PRICES ============
CREATE TABLE public.station_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type_id text NOT NULL REFERENCES public.fuel_types(id),
  price numeric(6,3) NOT NULL,
  confirmations integer NOT NULL DEFAULT 1,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id, fuel_type_id)
);
GRANT SELECT ON public.station_prices TO anon;
GRANT SELECT, INSERT, UPDATE ON public.station_prices TO authenticated;
GRANT ALL ON public.station_prices TO service_role;
ALTER TABLE public.station_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices readable" ON public.station_prices FOR SELECT USING (true);
CREATE POLICY "prices insert" ON public.station_prices FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "prices update" ON public.station_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_station_prices_station ON public.station_prices(station_id);
CREATE INDEX idx_station_prices_fuel ON public.station_prices(fuel_type_id);

CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type_id text NOT NULL REFERENCES public.fuel_types(id),
  price numeric(6,3) NOT NULL,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.price_history TO anon;
GRANT SELECT, INSERT ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price history readable" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "price history insert" ON public.price_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);
CREATE INDEX idx_price_history_station_created ON public.price_history(station_id, created_at DESC);
CREATE INDEX idx_price_history_fuel ON public.price_history(fuel_type_id);

-- ============ FUELINGS ============
CREATE TABLE public.fuelings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  fuel_type_id text NOT NULL REFERENCES public.fuel_types(id),
  filled_at timestamptz NOT NULL DEFAULT now(),
  liters numeric(8,3) NOT NULL CHECK (liters > 0),
  price_per_liter numeric(6,3) NOT NULL CHECK (price_per_liter > 0),
  total_cost numeric(10,2) NOT NULL CHECK (total_cost >= 0),
  odometer numeric(10,1) NOT NULL,
  full_tank boolean NOT NULL DEFAULT true,
  km_per_liter numeric(6,2),
  cost_per_km numeric(8,4),
  note text,
  photo_url text,
  client_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuelings TO authenticated;
GRANT ALL ON public.fuelings TO service_role;
ALTER TABLE public.fuelings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fuelings" ON public.fuelings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_fuelings_updated BEFORE UPDATE ON public.fuelings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_fuelings_user_date ON public.fuelings(user_id, filled_at DESC);
CREATE INDEX idx_fuelings_vehicle ON public.fuelings(vehicle_id);
CREATE INDEX idx_fuelings_station ON public.fuelings(station_id);
CREATE INDEX idx_fuelings_created ON public.fuelings(created_at DESC);

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);

-- ============ STATION REVIEWS / PHOTOS ============
CREATE TABLE public.station_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id, user_id)
);
GRANT SELECT ON public.station_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.station_reviews TO authenticated;
GRANT ALL ON public.station_reviews TO service_role;
ALTER TABLE public.station_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.station_reviews FOR SELECT USING (true);
CREATE POLICY "reviews write own" ON public.station_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews update own" ON public.station_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews delete own" ON public.station_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_reviews_station ON public.station_reviews(station_id);

CREATE TABLE public.station_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.station_photos TO anon;
GRANT SELECT, INSERT, DELETE ON public.station_photos TO authenticated;
GRANT ALL ON public.station_photos TO service_role;
ALTER TABLE public.station_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "station photos readable" ON public.station_photos FOR SELECT USING (true);
CREATE POLICY "station photos insert own" ON public.station_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "station photos delete own" ON public.station_photos FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_station_photos_station ON public.station_photos(station_id);

-- ============ SOCIAL: FOLLOWERS / CLUBS ============
CREATE TABLE public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.followers TO authenticated;
GRANT SELECT ON public.followers TO anon;
GRANT ALL ON public.followers TO service_role;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers readable" ON public.followers FOR SELECT USING (true);
CREATE POLICY "follow as self" ON public.followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "unfollow as self" ON public.followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);
CREATE INDEX idx_followers_follower ON public.followers(follower_id);
CREATE INDEX idx_followers_following ON public.followers(following_id);

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'brand' CHECK (kind IN ('brand','city','activity','custom')),
  cover_url text,
  city text,
  members_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs readable" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "clubs insert" ON public.clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "clubs update owner" ON public.clubs FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE INDEX idx_clubs_city ON public.clubs(city);

CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.club_members TO authenticated;
GRANT SELECT ON public.club_members TO anon;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club members readable" ON public.club_members FOR SELECT USING (true);
CREATE POLICY "join club as self" ON public.club_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave club as self" ON public.club_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_club_members_club ON public.club_members(club_id);
CREATE INDEX idx_club_members_user ON public.club_members(user_id);

CREATE OR REPLACE FUNCTION public.is_club_member(_club_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE club_id = _club_id AND user_id = _user_id);
$$;
CREATE OR REPLACE FUNCTION public.is_following(_follower uuid, _following uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.followers WHERE follower_id = _follower AND following_id = _following);
$$;

-- ============ POSTS / COMMENTS / LIKES ============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  fueling_id uuid REFERENCES public.fuelings(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'fueling' CHECK (kind IN ('fueling','review','photo','tip','promo','price')),
  audience text NOT NULL DEFAULT 'public' CHECK (audience IN ('public','friends','club')),
  content text,
  photo_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable" ON public.posts FOR SELECT USING (
  audience = 'public'
  OR auth.uid() = user_id
  OR (audience = 'friends' AND public.is_following(auth.uid(), user_id))
  OR (audience = 'club' AND club_id IS NOT NULL AND public.is_club_member(club_id, auth.uid()))
);
CREATE POLICY "posts insert own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts update own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts delete own" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_club ON public.posts(club_id);
CREATE INDEX idx_posts_station ON public.posts(station_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id)
);
CREATE POLICY "comments insert own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments delete own" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_comments_post ON public.comments(post_id, created_at DESC);

CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT ON public.likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes insert own" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes delete own" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_likes_post ON public.likes(post_id);

-- ============ GAMIFICATION ============
CREATE TABLE public.badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  xp_reward integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT ON public.user_badges TO anon;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user badges readable" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "user badges insert own" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

CREATE TABLE public.missions (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  period text NOT NULL DEFAULT 'weekly' CHECK (period IN ('weekly','monthly','event')),
  goal numeric(10,2) NOT NULL,
  unit text NOT NULL DEFAULT 'count',
  xp_reward integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.missions TO anon, authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions readable" ON public.missions FOR SELECT USING (true);

CREATE TABLE public.mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id text NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress numeric(10,2) NOT NULL DEFAULT 0,
  completed_at timestamptz,
  period_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, period_start)
);
GRANT SELECT, INSERT, UPDATE ON public.mission_progress TO authenticated;
GRANT ALL ON public.mission_progress TO service_role;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mission progress" ON public.mission_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_mission_progress_user ON public.mission_progress(user_id);

-- ============ INSIGHTS / STATS / NOTIFICATIONS ============
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'insight',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','good','warning')),
  title text NOT NULL,
  body text NOT NULL,
  savings_estimate numeric(10,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insights" ON public.ai_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ai_insights_user_created ON public.ai_insights(user_id, created_at DESC);

CREATE TABLE public.user_statistics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_fuelings integer NOT NULL DEFAULT 0,
  total_liters numeric(12,2) NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  total_km numeric(12,1) NOT NULL DEFAULT 0,
  avg_km_per_liter numeric(6,2),
  accumulated_savings numeric(12,2) NOT NULL DEFAULT 0,
  contributions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_statistics TO authenticated;
GRANT SELECT ON public.user_statistics TO anon;
GRANT ALL ON public.user_statistics TO service_role;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats readable" ON public.user_statistics FOR SELECT USING (true);
CREATE POLICY "own stats write" ON public.user_statistics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stats update" ON public.user_statistics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.vehicle_statistics (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_fuelings integer NOT NULL DEFAULT 0,
  total_liters numeric(12,2) NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  total_km numeric(12,1) NOT NULL DEFAULT 0,
  avg_km_per_liter numeric(6,2),
  best_km_per_liter numeric(6,2),
  worst_km_per_liter numeric(6,2),
  avg_price_per_liter numeric(6,3),
  cost_per_km numeric(8,4),
  avg_autonomy_km numeric(10,1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vehicle_statistics TO authenticated;
GRANT ALL ON public.vehicle_statistics TO service_role;
ALTER TABLE public.vehicle_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vehicle stats" ON public.vehicle_statistics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_vehicle_statistics_user ON public.vehicle_statistics(user_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);


-- ---------------------------------------------------------------------
-- supabase/migrations/20260727123926_7b888117-658b-4da8-8b9d-7878b8030ffd.sql
-- ---------------------------------------------------------------------

-- tighten permissive policies
DROP POLICY "stations update by owner or admin" ON public.stations;
CREATE POLICY "stations update by owner or admin" ON public.stations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

DROP POLICY "clubs update owner" ON public.clubs;
CREATE POLICY "clubs update owner" ON public.clubs FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

DROP POLICY "prices update" ON public.station_prices;
CREATE POLICY "prices update" ON public.station_prices FOR UPDATE TO authenticated
  USING (true) WITH CHECK (auth.uid() = reported_by AND price > 0);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- ============ SEED: BADGES ============
INSERT INTO public.badges (id,name,description,icon,xp_reward,sort_order) VALUES
 ('primeiro_tanque','Primeiro Tanque','Registrou o primeiro abastecimento','fuel',50,1),
 ('economista','Economista','Economizou R$ 100 acumulados','piggy-bank',100,2),
 ('economista_ouro','Economista Ouro','Economizou R$ 1.000 acumulados','trophy',400,3),
 ('colaborador','Colaborador','Compartilhou 10 preços com a comunidade','users',150,4),
 ('sentinela','Sentinela de Preços','Confirmou 25 preços de postos','shield-check',200,5),
 ('regularidade','Regularidade','10 abastecimentos registrados','calendar-check',120,6),
 ('maratonista','Maratonista','5.000 km registrados','route',250,7),
 ('eficiente','Motorista Eficiente','Consumo 10% acima da média da cidade','leaf',200,8),
 ('explorador','Explorador','Abasteceu em 10 postos diferentes','map-pin',180,9),
 ('fotografo','Fotógrafo','Enviou 5 fotos de postos','camera',80,10),
 ('clubista','Clubista','Entrou em um clube','flag',40,11),
 ('influente','Influente','Recebeu 50 curtidas','heart',220,12)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: MISSIONS ============
INSERT INTO public.missions (id,title,description,period,goal,unit,xp_reward,active) VALUES
 ('semana_registro','Semana Registrada','Registre 2 abastecimentos nesta semana','weekly',2,'abastecimentos',80,true),
 ('semana_preco','Preço Colaborativo','Compartilhe 3 preços de postos nesta semana','weekly',3,'preços',100,true),
 ('semana_economia','Economista Semanal','Economize R$ 30 escolhendo postos mais baratos','weekly',30,'reais',120,true),
 ('mes_consistencia','Consistência Mensal','Registre 8 abastecimentos no mês','monthly',8,'abastecimentos',300,true),
 ('mes_km','Mês na Estrada','Registre 1.000 km no mês','monthly',1000,'km',250,true),
 ('mes_comunidade','Voz da Comunidade','Faça 5 avaliações ou comentários no mês','monthly',5,'interações',200,true)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: CLUBS ============
INSERT INTO public.clubs (id,slug,name,description,kind,city,members_count) VALUES
 ('11111111-0000-4000-8000-000000000001','fiat','Fiat Brasil','Donos de Fiat trocando consumo real e dicas de economia','brand',NULL,4820),
 ('11111111-0000-4000-8000-000000000002','volkswagen','Volkswagen','Consumo, manutenção e economia em VW','brand',NULL,5310),
 ('11111111-0000-4000-8000-000000000003','toyota','Toyota','Híbridos e flex Toyota','brand',NULL,3170),
 ('11111111-0000-4000-8000-000000000004','chevrolet','Chevrolet','Onix, Tracker e companhia','brand',NULL,4490),
 ('11111111-0000-4000-8000-000000000005','uber','Motoristas de App','Quem roda muito e precisa economizar mais','activity',NULL,7860),
 ('11111111-0000-4000-8000-000000000006','entregadores','Entregadores','Motos e utilitários no delivery','activity',NULL,3940),
 ('11111111-0000-4000-8000-000000000007','goiania','Goiânia','Preços e postos da capital goiana','city','Goiânia',2610),
 ('11111111-0000-4000-8000-000000000008','sao-paulo','São Paulo','A maior comunidade de preços do país','city','São Paulo',9120)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: STATIONS ============
INSERT INTO public.stations (id,name,brand,address,city,state,latitude,longitude,is_24h,has_convenience,rating,reviews_count,fillups_count,reliability_score) VALUES
 ('22222222-0000-4000-8000-000000000001','Posto Bandeirantes','Ipiranga','Av. T-63, 1200','Goiânia','GO',-16.7050,-49.2900,true,true,4.60,182,940,92),
 ('22222222-0000-4000-8000-000000000002','Auto Posto Serra Dourada','Shell','Av. 85, 2450','Goiânia','GO',-16.7020,-49.2650,true,true,4.40,143,760,88),
 ('22222222-0000-4000-8000-000000000003','Posto Cerrado','Petrobras','Av. Anhanguera, 5100','Goiânia','GO',-16.6800,-49.2550,false,false,4.10,96,420,74),
 ('22222222-0000-4000-8000-000000000004','Posto Economia GO','Bandeira branca','Av. Perimetral Norte, 800','Goiânia','GO',-16.6600,-49.2800,true,false,3.90,64,310,61),
 ('22222222-0000-4000-8000-000000000005','Posto Jardim América','Ale','Rua 90, 340','Goiânia','GO',-16.7100,-49.2720,false,true,4.30,77,280,69),
 ('22222222-0000-4000-8000-000000000006','Posto Paulista Center','Shell','Av. Paulista, 1500','São Paulo','SP',-23.5614,-46.6558,true,true,4.50,410,2100,95),
 ('22222222-0000-4000-8000-000000000007','Posto Ibirapuera','Ipiranga','Av. Ibirapuera, 2200','São Paulo','SP',-23.6100,-46.6660,true,true,4.20,318,1740,90),
 ('22222222-0000-4000-8000-000000000008','Posto Marginal Tietê','Petrobras','Marginal Tietê, km 20','São Paulo','SP',-23.5150,-46.6400,true,false,3.80,205,1320,82),
 ('22222222-0000-4000-8000-000000000009','Posto Vila Mariana','Ale','Rua Domingos de Morais, 900','São Paulo','SP',-23.5900,-46.6350,false,true,4.10,166,880,77),
 ('22222222-0000-4000-8000-00000000000a','Posto Lapa Econômico','Bandeira branca','Rua Guaicurus, 400','São Paulo','SP',-23.5250,-46.7000,false,false,3.70,88,410,63)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: STATION PRICES ============
INSERT INTO public.station_prices (station_id,fuel_type_id,price,confirmations) VALUES
 ('22222222-0000-4000-8000-000000000001','gasolina',5.699,14),
 ('22222222-0000-4000-8000-000000000001','etanol',3.899,11),
 ('22222222-0000-4000-8000-000000000001','diesel',5.999,6),
 ('22222222-0000-4000-8000-000000000002','gasolina',5.849,9),
 ('22222222-0000-4000-8000-000000000002','etanol',3.999,8),
 ('22222222-0000-4000-8000-000000000003','gasolina',5.759,5),
 ('22222222-0000-4000-8000-000000000003','etanol',3.949,4),
 ('22222222-0000-4000-8000-000000000004','gasolina',5.599,7),
 ('22222222-0000-4000-8000-000000000004','etanol',3.849,7),
 ('22222222-0000-4000-8000-000000000005','gasolina',5.789,3),
 ('22222222-0000-4000-8000-000000000005','gnv',4.299,3),
 ('22222222-0000-4000-8000-000000000006','gasolina',6.099,22),
 ('22222222-0000-4000-8000-000000000006','etanol',4.199,19),
 ('22222222-0000-4000-8000-000000000006','diesel',6.199,12),
 ('22222222-0000-4000-8000-000000000007','gasolina',5.989,17),
 ('22222222-0000-4000-8000-000000000007','etanol',4.099,15),
 ('22222222-0000-4000-8000-000000000008','gasolina',5.899,13),
 ('22222222-0000-4000-8000-000000000008','diesel',6.049,16),
 ('22222222-0000-4000-8000-000000000009','gasolina',6.049,8),
 ('22222222-0000-4000-8000-000000000009','etanol',4.149,6),
 ('22222222-0000-4000-8000-00000000000a','gasolina',5.849,4),
 ('22222222-0000-4000-8000-00000000000a','etanol',4.049,4)
ON CONFLICT (station_id, fuel_type_id) DO NOTHING;

-- ============ SEED: PRICE HISTORY (30 dias) ============
INSERT INTO public.price_history (station_id, fuel_type_id, price, created_at)
SELECT sp.station_id,
       sp.fuel_type_id,
       ROUND((sp.price * (1 + ((d % 7) - 3) * 0.004))::numeric, 3),
       now() - (d || ' days')::interval
FROM public.station_prices sp
CROSS JOIN generate_series(1, 30) AS d;


-- ---------------------------------------------------------------------
-- supabase/migrations/20260728121209_81693850-f89f-45ad-9f48-f659b13b2e79.sql
-- ---------------------------------------------------------------------
-- 1. updated_at triggers
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fuelings_set_updated_at BEFORE UPDATE ON public.fuelings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER stations_set_updated_at BEFORE UPDATE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. profile + statistics on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_statistics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. statistics recalculation
CREATE OR REPLACE FUNCTION public.recalc_statistics(_user_id uuid, _vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  u RECORD;
BEGIN
  -- per-fueling km/L is stored on the row; aggregate what exists
  IF _vehicle_id IS NOT NULL THEN
    SELECT
      count(*)::int AS total_fuelings,
      COALESCE(sum(liters), 0) AS total_liters,
      COALESCE(sum(total_cost), 0) AS total_spent,
      COALESCE(max(odometer) - min(odometer), 0) AS total_km,
      avg(km_per_liter) AS avg_kml,
      max(km_per_liter) AS best_kml,
      min(km_per_liter) AS worst_kml,
      avg(price_per_liter) AS avg_ppl
    INTO v
    FROM public.fuelings WHERE vehicle_id = _vehicle_id;

    INSERT INTO public.vehicle_statistics AS vs (
      vehicle_id, user_id, total_fuelings, total_liters, total_spent, total_km,
      avg_km_per_liter, best_km_per_liter, worst_km_per_liter, avg_price_per_liter,
      cost_per_km, avg_autonomy_km, updated_at
    )
    VALUES (
      _vehicle_id, _user_id, v.total_fuelings, v.total_liters, v.total_spent, v.total_km,
      v.avg_kml, v.best_kml, v.worst_kml, v.avg_ppl,
      CASE WHEN v.total_km > 0 THEN v.total_spent / v.total_km ELSE NULL END,
      v.avg_kml * COALESCE((SELECT tank_liters FROM public.vehicles WHERE id = _vehicle_id), 0),
      now()
    )
    ON CONFLICT (vehicle_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      total_fuelings = EXCLUDED.total_fuelings,
      total_liters = EXCLUDED.total_liters,
      total_spent = EXCLUDED.total_spent,
      total_km = EXCLUDED.total_km,
      avg_km_per_liter = EXCLUDED.avg_km_per_liter,
      best_km_per_liter = EXCLUDED.best_km_per_liter,
      worst_km_per_liter = EXCLUDED.worst_km_per_liter,
      avg_price_per_liter = EXCLUDED.avg_price_per_liter,
      cost_per_km = EXCLUDED.cost_per_km,
      avg_autonomy_km = EXCLUDED.avg_autonomy_km,
      updated_at = now();

    UPDATE public.vehicles SET current_odometer = GREATEST(
      current_odometer,
      COALESCE((SELECT max(odometer) FROM public.fuelings WHERE vehicle_id = _vehicle_id), 0)
    ) WHERE id = _vehicle_id;
  END IF;

  SELECT
    count(*)::int AS total_fuelings,
    COALESCE(sum(liters), 0) AS total_liters,
    COALESCE(sum(total_cost), 0) AS total_spent,
    avg(km_per_liter) AS avg_kml
  INTO u
  FROM public.fuelings WHERE user_id = _user_id;

  INSERT INTO public.user_statistics AS us (
    user_id, total_fuelings, total_liters, total_spent, total_km, avg_km_per_liter, updated_at
  )
  VALUES (
    _user_id, u.total_fuelings, u.total_liters, u.total_spent,
    COALESCE((SELECT sum(total_km) FROM public.vehicle_statistics WHERE user_id = _user_id), 0),
    u.avg_kml, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_fuelings = EXCLUDED.total_fuelings,
    total_liters = EXCLUDED.total_liters,
    total_spent = EXCLUDED.total_spent,
    total_km = EXCLUDED.total_km,
    avg_km_per_liter = EXCLUDED.avg_km_per_liter,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.fuelings_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_statistics(OLD.user_id, OLD.vehicle_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_statistics(NEW.user_id, NEW.vehicle_id);
  IF TG_OP = 'UPDATE' AND OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
    PERFORM public.recalc_statistics(OLD.user_id, OLD.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fuelings_stats_sync
AFTER INSERT OR UPDATE OR DELETE ON public.fuelings
FOR EACH ROW EXECUTE FUNCTION public.fuelings_after_change();

-- 4. indexes
CREATE INDEX IF NOT EXISTS idx_fuelings_user_filled_at ON public.fuelings (user_id, filled_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuelings_vehicle_odometer ON public.fuelings (vehicle_id, odometer DESC);
CREATE INDEX IF NOT EXISTS idx_fuelings_station ON public.fuelings (station_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON public.vehicles (user_id, is_primary DESC);
CREATE INDEX IF NOT EXISTS idx_station_prices_station_fuel ON public.station_prices (station_id, fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_stations_city ON public.stations (city);
CREATE INDEX IF NOT EXISTS idx_price_history_station_created ON public.price_history (station_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created ON public.ai_insights (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts (created_at DESC);

-- ---------------------------------------------------------------------
-- supabase/migrations/20260728121237_97b8556e-3b8a-4b4a-b023-ac375c47eb5d.sql
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.recalc_statistics(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fuelings_after_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

-- ---------------------------------------------------------------------
-- supabase/migrations/20260729115156_b57ac581-196a-4cd9-8283-7dc539f9ba43.sql
-- ---------------------------------------------------------------------
-- 1. user_statistics: own-only reads
DROP POLICY IF EXISTS "stats readable" ON public.user_statistics;
CREATE POLICY "own stats readable" ON public.user_statistics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.user_statistics FROM anon;

-- 2. comments: mirror post visibility
DROP POLICY IF EXISTS "comments readable" ON public.comments;
CREATE POLICY "comments readable" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = comments.post_id
        AND (
          p.audience = 'public'
          OR auth.uid() = p.user_id
          OR (p.audience = 'friends' AND public.is_following(auth.uid(), p.user_id))
          OR (p.audience = 'club' AND p.club_id IS NOT NULL AND public.is_club_member(p.club_id, auth.uid()))
        )
    )
  );

-- 3. station_prices: only the reporter can update their row
DROP POLICY IF EXISTS "prices update" ON public.station_prices;
CREATE POLICY "prices update" ON public.station_prices
  FOR UPDATE TO authenticated
  USING (auth.uid() = reported_by)
  WITH CHECK (auth.uid() = reported_by AND price > 0);

-- 4. social graph not public to anonymous visitors
DROP POLICY IF EXISTS "followers readable" ON public.followers;
CREATE POLICY "followers readable" ON public.followers
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.followers FROM anon;

DROP POLICY IF EXISTS "club members readable" ON public.club_members;
CREATE POLICY "club members readable" ON public.club_members
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.club_members FROM anon;

-- 5. admin role check is not for anonymous callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- 6. supporting indexes for the hot read paths
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_fuelings_user_filled_at ON public.fuelings (user_id, filled_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuelings_vehicle_odometer ON public.fuelings (vehicle_id, odometer);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_station_prices_station ON public.station_prices (station_id, fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- ---------------------------------------------------------------------
-- supabase/migrations/20260730130054_bf81b5da-64e6-4734-b002-e33fbd04be7f.sql
-- ---------------------------------------------------------------------
-- 1. club_members: restrict roster visibility to club members
DROP POLICY IF EXISTS "Club members are viewable by authenticated" ON public.club_members;
DROP POLICY IF EXISTS "Club members viewable by authenticated" ON public.club_members;
DROP POLICY IF EXISTS "club_members_select" ON public.club_members;
DROP POLICY IF EXISTS "Anyone can view club members" ON public.club_members;
CREATE POLICY "club_members_select_same_club" ON public.club_members
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_club_member(club_id, auth.uid()));

-- 2. followers: only relationships involving the requesting user
DROP POLICY IF EXISTS "Followers are viewable by authenticated" ON public.followers;
DROP POLICY IF EXISTS "Followers viewable by authenticated" ON public.followers;
DROP POLICY IF EXISTS "followers_select" ON public.followers;
DROP POLICY IF EXISTS "Anyone can view followers" ON public.followers;
CREATE POLICY "followers_select_own_edges" ON public.followers
FOR SELECT TO authenticated
USING (follower_id = auth.uid() OR following_id = auth.uid());

-- 3. hide reporter identity on public price data (column-level grants)
REVOKE SELECT ON public.price_history FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type_id, price, created_at)
  ON public.price_history TO anon, authenticated;

REVOKE SELECT ON public.station_prices FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type_id, price, confirmations, reported_at, updated_at)
  ON public.station_prices TO anon, authenticated;

GRANT ALL ON public.price_history TO service_role;
GRANT ALL ON public.station_prices TO service_role;

-- 4. SECURITY DEFINER functions must not be callable from the Data API
REVOKE ALL ON FUNCTION public.recalc_statistics(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fuelings_after_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_club_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_following(uuid, uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------
-- supabase/migrations/20260803155813_5d6588e9-ec42-4c58-b3fd-f788f191703d.sql
-- ---------------------------------------------------------------------
GRANT SELECT ON public.station_prices TO anon, authenticated;
GRANT ALL ON public.station_prices TO service_role;

-- ---------------------------------------------------------------------
-- supabase/migrations/20260803160304_337dd416-3753-4bda-b0ee-9757972d8c4a.sql
-- ---------------------------------------------------------------------
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'sugestao',
  rating integer,
  message text NOT NULL,
  page text,
  app_version text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback insert own" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedback read own" ON public.feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.feedback_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind NOT IN ('problema','sugestao','elogio') THEN
    RAISE EXCEPTION 'Tipo de feedback inválido';
  END IF;
  IF NEW.rating IS NOT NULL AND (NEW.rating < 1 OR NEW.rating > 5) THEN
    RAISE EXCEPTION 'Nota deve ficar entre 1 e 5';
  END IF;
  IF length(btrim(NEW.message)) < 3 THEN
    RAISE EXCEPTION 'Mensagem muito curta';
  END IF;
  NEW.message = left(btrim(NEW.message), 2000);
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_validate_before_insert
BEFORE INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.feedback_validate();

CREATE INDEX feedback_user_created_idx ON public.feedback (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- supabase/migrations/20260804200721_2d02663a-9a1d-42ef-90ef-cf3d605ab17d.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- supabase/migrations/20260921161728_f6251105-372b-42e2-8aca-ec15570cb505.sql
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "public profiles readable" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ---------------------------------------------------------------------
-- supabase/migrations/20260924162834_476a7b31-bf13-4718-bac4-21b874318f26.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN age_range text,
  ADD COLUMN gender text;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_range_check CHECK (age_range IS NULL OR age_range IN ('18-24','25-34','35-44','45-54','55+','nao_informar')),
  ADD CONSTRAINT profiles_gender_check CHECK (gender IS NULL OR gender IN ('mulher','homem','nao_binario','outro','nao_informar'));

-- ---------------------------------------------------------------------
-- drizzle/migrations/0000_beta_lockdown_social_and_private_profiles.sql
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.stations, public.station_prices, public.price_history FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.posts, public.comments, public.likes, public.clubs, public.club_members, public.followers, public.user_badges, public.station_reviews, public.station_photos FROM authenticated;
REVOKE SELECT ON public.posts, public.comments, public.likes, public.user_badges, public.station_reviews, public.station_photos FROM anon;
ALTER TABLE public.profiles ALTER COLUMN visibility SET DEFAULT 'private';
UPDATE public.profiles SET visibility = 'private' WHERE visibility IS DISTINCT FROM 'private';

-- ---------------------------------------------------------------------
-- drizzle/migrations/0001_usage_events_and_vehicle_fixes.sql
-- ---------------------------------------------------------------------
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  name text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  route text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own events" ON public.events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX events_user_created_idx ON public.events (user_id, created_at);

CREATE OR REPLACE FUNCTION public.recalc_statistics(_user_id uuid, _vehicle_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v RECORD;
  u RECORD;
BEGIN
  IF _vehicle_id IS NOT NULL THEN
    SELECT count(*)::int AS total_fuelings, COALESCE(sum(liters), 0) AS total_liters,
      COALESCE(sum(total_cost), 0) AS total_spent, COALESCE(max(odometer) - min(odometer), 0) AS total_km,
      avg(km_per_liter) AS avg_kml, max(km_per_liter) AS best_kml, min(km_per_liter) AS worst_kml,
      avg(price_per_liter) AS avg_ppl
    INTO v FROM public.fuelings WHERE vehicle_id = _vehicle_id;

    INSERT INTO public.vehicle_statistics AS vs (
      vehicle_id, user_id, total_fuelings, total_liters, total_spent, total_km,
      avg_km_per_liter, best_km_per_liter, worst_km_per_liter, avg_price_per_liter,
      cost_per_km, avg_autonomy_km, updated_at)
    VALUES (_vehicle_id, _user_id, v.total_fuelings, v.total_liters, v.total_spent, v.total_km,
      v.avg_kml, v.best_kml, v.worst_kml, v.avg_ppl,
      CASE WHEN v.total_km > 0 THEN v.total_spent / v.total_km ELSE NULL END,
      v.avg_kml * COALESCE((SELECT tank_liters FROM public.vehicles WHERE id = _vehicle_id), 0), now())
    ON CONFLICT (vehicle_id) DO UPDATE SET
      user_id = EXCLUDED.user_id, total_fuelings = EXCLUDED.total_fuelings, total_liters = EXCLUDED.total_liters,
      total_spent = EXCLUDED.total_spent, total_km = EXCLUDED.total_km, avg_km_per_liter = EXCLUDED.avg_km_per_liter,
      best_km_per_liter = EXCLUDED.best_km_per_liter, worst_km_per_liter = EXCLUDED.worst_km_per_liter,
      avg_price_per_liter = EXCLUDED.avg_price_per_liter, cost_per_km = EXCLUDED.cost_per_km,
      avg_autonomy_km = EXCLUDED.avg_autonomy_km, updated_at = now();

    UPDATE public.vehicles SET current_odometer = GREATEST(
      initial_odometer,
      COALESCE((SELECT max(odometer) FROM public.fuelings WHERE vehicle_id = _vehicle_id), 0)
    ) WHERE id = _vehicle_id;
  END IF;

  SELECT count(*)::int AS total_fuelings, COALESCE(sum(liters), 0) AS total_liters,
    COALESCE(sum(total_cost), 0) AS total_spent, avg(km_per_liter) AS avg_kml
  INTO u FROM public.fuelings WHERE user_id = _user_id;

  INSERT INTO public.user_statistics AS us (user_id, total_fuelings, total_liters, total_spent, total_km, avg_km_per_liter, updated_at)
  VALUES (_user_id, u.total_fuelings, u.total_liters, u.total_spent,
    COALESCE((SELECT sum(total_km) FROM public.vehicle_statistics WHERE user_id = _user_id), 0), u.avg_kml, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_fuelings = EXCLUDED.total_fuelings, total_liters = EXCLUDED.total_liters, total_spent = EXCLUDED.total_spent,
    total_km = EXCLUDED.total_km, avg_km_per_liter = EXCLUDED.avg_km_per_liter, updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_primary_vehicle(_vehicle_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id = _vehicle_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Veículo não encontrado';
  END IF;
  UPDATE public.vehicles SET is_primary = (id = _vehicle_id) WHERE user_id = auth.uid();
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_primary_vehicle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_primary_vehicle(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- drizzle/migrations/0002_profile_identity_and_age.sql
-- ---------------------------------------------------------------------
-- Identidade básica no primeiro acesso: nome, sobrenome e data de nascimento (18+).
-- O e-mail continua só no auth (login), sem ficar público no perfil.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS birth_date date;

-- Quem já tinha nome completo ganha nome/sobrenome separados.
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(btrim(full_name), ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
  )
WHERE full_name IS NOT NULL AND btrim(full_name) <> '';

-- Validação no servidor (vale também para chamadas diretas à API):
-- maioridade, data plausível, tamanho dos nomes e full_name sempre em sincronia.
CREATE OR REPLACE FUNCTION public.profiles_validate_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Só valida o que mudou: registros antigos continuam editáveis.
  IF NEW.first_name IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.first_name IS DISTINCT FROM OLD.first_name) THEN
    NEW.first_name := btrim(NEW.first_name);
    IF length(NEW.first_name) < 2 OR length(NEW.first_name) > 40 THEN
      RAISE EXCEPTION 'Nome inválido';
    END IF;
  END IF;

  IF NEW.last_name IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.last_name IS DISTINCT FROM OLD.last_name) THEN
    NEW.last_name := btrim(NEW.last_name);
    IF length(NEW.last_name) < 2 OR length(NEW.last_name) > 60 THEN
      RAISE EXCEPTION 'Sobrenome inválido';
    END IF;
  END IF;

  IF NEW.birth_date IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.birth_date IS DISTINCT FROM OLD.birth_date) THEN
    IF NEW.birth_date > (current_date - interval '18 years')::date THEN
      RAISE EXCEPTION 'O Tanque+ é para maiores de 18 anos';
    END IF;
    IF NEW.birth_date < (current_date - interval '110 years')::date THEN
      RAISE EXCEPTION 'Data de nascimento inválida';
    END IF;
  END IF;

  IF NEW.first_name IS NOT NULL AND (
    TG_OP = 'INSERT'
    OR NEW.first_name IS DISTINCT FROM OLD.first_name
    OR NEW.last_name IS DISTINCT FROM OLD.last_name
  ) THEN
    NEW.full_name := btrim(NEW.first_name || ' ' || COALESCE(NEW.last_name, ''));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_validate_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_validate_identity ON public.profiles;
CREATE TRIGGER profiles_validate_identity
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_validate_identity();

-- Limite de tamanho da foto (data URL), pendência da auditoria.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_size_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_size_check
  CHECK (avatar_url IS NULL OR length(avatar_url) <= 200000) NOT VALID;

-- ---------------------------------------------------------------------
-- drizzle/migrations/0003_migration.sql
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "likes readable" ON public.likes;
CREATE POLICY "likes readable by owner" ON public.likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user badges readable" ON public.user_badges;
CREATE POLICY "user badges readable by owner" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reviews readable" ON public.station_reviews;
CREATE POLICY "reviews readable by owner" ON public.station_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "station photos readable" ON public.station_photos;
CREATE POLICY "station photos readable by owner" ON public.station_photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "fuel types readable" ON public.fuel_types;
CREATE POLICY "fuel types readable by signed-in users" ON public.fuel_types FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "badges readable" ON public.badges;
CREATE POLICY "badges readable by signed-in users" ON public.badges FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "missions readable" ON public.missions;
CREATE POLICY "missions readable by signed-in users" ON public.missions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------
-- drizzle/migrations/0004_lock_down_social_reads.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- supabase/migrations/20261016190000_grant_role_helpers.sql
-- ---------------------------------------------------------------------
-- As funções usadas nas regras de acesso precisam poder ser executadas por quem está logado.
-- Em projetos Supabase novos isso não vem por padrão depois do REVOKE ... FROM PUBLIC,
-- e sem isso o app não reconhece administradores (has_role sempre "falso").
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_following(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- supabase/migrations/20261017200000_fuel_price_references.sql
-- ---------------------------------------------------------------------
-- Preços de referência públicos (ANP — Levantamento de Preços de Combustíveis).
-- Médias semanais por município e por estado. Não há dado pessoal: é informação pública,
-- legível por quem está logado e gravada só pelo servidor (service_role).

CREATE TABLE IF NOT EXISTS public.fuel_price_references (
  id bigserial PRIMARY KEY,
  source text NOT NULL DEFAULT 'ANP',
  week_start date NOT NULL,
  week_end date NOT NULL,
  scope text NOT NULL CHECK (scope IN ('municipio', 'estado')),
  uf text NOT NULL,
  municipio text NOT NULL DEFAULT '',
  municipio_label text,
  fuel_type_id text NOT NULL REFERENCES public.fuel_types(id),
  avg_price numeric(8,3) NOT NULL CHECK (avg_price > 0 AND avg_price < 50),
  min_price numeric(8,3),
  max_price numeric(8,3),
  stations integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, week_start, scope, uf, municipio, fuel_type_id)
);

CREATE INDEX IF NOT EXISTS fuel_price_references_lookup_idx
  ON public.fuel_price_references (uf, municipio, fuel_type_id, week_start DESC);

ALTER TABLE public.fuel_price_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price references readable by signed-in users" ON public.fuel_price_references;
CREATE POLICY "price references readable by signed-in users" ON public.fuel_price_references
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.fuel_price_references FROM anon, authenticated;
GRANT SELECT ON public.fuel_price_references TO authenticated;
GRANT ALL ON public.fuel_price_references TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fuel_price_references_id_seq TO service_role;

-- ---------------------------------------------------------------------
-- supabase/migrations/20261018120000_app_errors.sql
-- ---------------------------------------------------------------------
-- Registro técnico de erros do app (monitoramento), sem nome nem e-mail.
-- Qualquer visitante pode registrar um erro (inclusive antes de entrar); só o servidor lê.
-- Mantido por até 90 dias (limpeza diária na tarefa agendada).

CREATE TABLE IF NOT EXISTS public.app_errors (
  id bigserial PRIMARY KEY,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text CHECK (char_length(name) <= 100),
  message text NOT NULL CHECK (char_length(message) <= 500),
  stack text CHECK (char_length(stack) <= 4000),
  route text CHECK (char_length(route) <= 200),
  mechanism text CHECK (char_length(mechanism) <= 50),
  user_agent text CHECK (char_length(user_agent) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_errors_created_idx ON public.app_errors (created_at DESC);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can report errors" ON public.app_errors;
CREATE POLICY "anyone can report errors" ON public.app_errors
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

REVOKE ALL ON public.app_errors FROM anon, authenticated;
GRANT INSERT ON public.app_errors TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.app_errors_id_seq TO anon, authenticated;
GRANT ALL ON public.app_errors TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.app_errors_id_seq TO service_role;
