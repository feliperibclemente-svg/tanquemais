DROP POLICY IF EXISTS "public profiles readable" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);