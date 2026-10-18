-- Check-up do Teo: troca de óleo no veículo e histórico de check-ups.
-- A pessoa só vê e mexe nos próprios registros.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS oil_change_km numeric CHECK (oil_change_km IS NULL OR oil_change_km >= 0),
  ADD COLUMN IF NOT EXISTS oil_change_interval_km integer
    CHECK (oil_change_interval_km IS NULL OR oil_change_interval_km BETWEEN 500 AND 50000);

CREATE TABLE IF NOT EXISTS public.vehicle_checkups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(answers) <= 4000),
  findings text[] NOT NULL DEFAULT '{}' CHECK (cardinality(findings) <= 30),
  odometer numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_checkups_user_idx
  ON public.vehicle_checkups (user_id, created_at DESC);

ALTER TABLE public.vehicle_checkups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own checkups" ON public.vehicle_checkups;
CREATE POLICY "own checkups" ON public.vehicle_checkups
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid())
  );

REVOKE ALL ON public.vehicle_checkups FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.vehicle_checkups TO authenticated;
GRANT ALL ON public.vehicle_checkups TO service_role;
