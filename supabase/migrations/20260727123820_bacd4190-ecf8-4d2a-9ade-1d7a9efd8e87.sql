
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
