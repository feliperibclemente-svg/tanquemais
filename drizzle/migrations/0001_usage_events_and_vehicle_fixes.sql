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