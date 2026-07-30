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