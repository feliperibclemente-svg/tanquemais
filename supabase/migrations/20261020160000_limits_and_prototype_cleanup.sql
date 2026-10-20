-- Auditoria técnica, etapas 4 e 5.
--
-- 1) Limite diário de uso de IA por pessoa (dica do Teo e moderação da comunidade).
--    Tabela sem acesso direto; só a função ai_take, que conta e responde se ainda pode.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('dica', 'moderacao')),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM anon, authenticated;
GRANT ALL ON public.ai_usage TO service_role;

CREATE OR REPLACE FUNCTION public.ai_take(_kind text, _max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _count integer;
BEGIN
  IF _uid IS NULL OR _kind NOT IN ('dica', 'moderacao') OR _max IS NULL OR _max < 1 OR _max > 100 THEN
    RETURN false;
  END IF;
  INSERT INTO public.ai_usage AS u (user_id, day, kind, count)
  VALUES (_uid, _today, _kind, 1)
  ON CONFLICT (user_id, day, kind) DO UPDATE SET count = u.count + 1
  RETURNING count INTO _count;
  RETURN _count <= _max;
END;
$$;
REVOKE ALL ON FUNCTION public.ai_take(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_take(text, integer) TO authenticated;

-- 2) app_errors aceita gravação sem login (erros antes do login). Para o banco não encher
--    por abuso: no máximo 200 por hora e 20.000 no total. O excedente é descartado em
--    silêncio (o app não depende dessa gravação).
CREATE OR REPLACE FUNCTION public.app_errors_throttle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.app_errors WHERE created_at > now() - interval '1 hour') >= 200
     OR (SELECT count(*) FROM public.app_errors) >= 20000 THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.app_errors_throttle() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS app_errors_throttle ON public.app_errors;
CREATE TRIGGER app_errors_throttle BEFORE INSERT ON public.app_errors
  FOR EACH ROW EXECUTE FUNCTION public.app_errors_throttle();

-- 3) Dados inventados do protótipo (Lovable): postos, preços, histórico de preços e clubes
--    de exemplo. Só as linhas com os identificadores do seed; nada criado por usuários.
DELETE FROM public.price_history
  WHERE station_id::text LIKE '22222222-0000-4000-8000-%' AND reported_by IS NULL;
DELETE FROM public.station_prices WHERE station_id::text LIKE '22222222-0000-4000-8000-%';
UPDATE public.fuelings SET station_id = NULL WHERE station_id::text LIKE '22222222-0000-4000-8000-%';
DELETE FROM public.stations WHERE id::text LIKE '22222222-0000-4000-8000-%';
DELETE FROM public.clubs WHERE id::text LIKE '11111111-0000-4000-8000-%';
