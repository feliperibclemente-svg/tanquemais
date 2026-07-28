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