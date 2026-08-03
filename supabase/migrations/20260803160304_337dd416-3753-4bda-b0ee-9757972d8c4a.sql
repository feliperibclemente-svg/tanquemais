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