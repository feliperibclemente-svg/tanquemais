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
