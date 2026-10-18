-- Controle do e-mail de boas-vindas: uma linha por pessoa, gravada antes do envio,
-- para o e-mail nunca sair duas vezes. Só o servidor lê e escreve.

CREATE TABLE IF NOT EXISTS public.welcome_emails (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.welcome_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.welcome_emails FROM anon, authenticated;
GRANT ALL ON public.welcome_emails TO service_role;
