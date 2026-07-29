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