-- Identidade básica no primeiro acesso: nome, sobrenome e data de nascimento (18+).
-- O e-mail continua só no auth (login), sem ficar público no perfil.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS birth_date date;

-- Quem já tinha nome completo ganha nome/sobrenome separados.
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(btrim(full_name), ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
  )
WHERE full_name IS NOT NULL AND btrim(full_name) <> '';

-- Validação no servidor (vale também para chamadas diretas à API):
-- maioridade, data plausível, tamanho dos nomes e full_name sempre em sincronia.
CREATE OR REPLACE FUNCTION public.profiles_validate_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Só valida o que mudou: registros antigos continuam editáveis.
  IF NEW.first_name IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.first_name IS DISTINCT FROM OLD.first_name) THEN
    NEW.first_name := btrim(NEW.first_name);
    IF length(NEW.first_name) < 2 OR length(NEW.first_name) > 40 THEN
      RAISE EXCEPTION 'Nome inválido';
    END IF;
  END IF;

  IF NEW.last_name IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.last_name IS DISTINCT FROM OLD.last_name) THEN
    NEW.last_name := btrim(NEW.last_name);
    IF length(NEW.last_name) < 2 OR length(NEW.last_name) > 60 THEN
      RAISE EXCEPTION 'Sobrenome inválido';
    END IF;
  END IF;

  IF NEW.birth_date IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.birth_date IS DISTINCT FROM OLD.birth_date) THEN
    IF NEW.birth_date > (current_date - interval '18 years')::date THEN
      RAISE EXCEPTION 'O Tanque+ é para maiores de 18 anos';
    END IF;
    IF NEW.birth_date < (current_date - interval '110 years')::date THEN
      RAISE EXCEPTION 'Data de nascimento inválida';
    END IF;
  END IF;

  IF NEW.first_name IS NOT NULL AND (
    TG_OP = 'INSERT'
    OR NEW.first_name IS DISTINCT FROM OLD.first_name
    OR NEW.last_name IS DISTINCT FROM OLD.last_name
  ) THEN
    NEW.full_name := btrim(NEW.first_name || ' ' || COALESCE(NEW.last_name, ''));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_validate_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_validate_identity ON public.profiles;
CREATE TRIGGER profiles_validate_identity
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_validate_identity();

-- Limite de tamanho da foto (data URL), pendência da auditoria.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_size_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_size_check
  CHECK (avatar_url IS NULL OR length(avatar_url) <= 200000) NOT VALID;
