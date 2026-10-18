-- Comunidade do beta: mural de dicas, anônimo e com revisão antes de aparecer.
--
-- Regras (garantidas aqui no banco, não só na tela):
-- - Ninguém acessa as tabelas diretamente; tudo passa pelas funções abaixo.
-- - O autor nunca é exposto: o mural mostra só "Motorista".
-- - Toda publicação nasce "pendente" e só aparece depois de aprovada no admin.
-- - Uma denúncia tira a publicação do ar ("em_revisao") até nova revisão.
-- - Texto de 10 a 500 caracteres, sem links; no máximo 5 publicações por dia.
-- As tabelas antigas (posts, comments, likes, clubs, followers) continuam travadas.

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN ('consumo', 'economia', 'precos', 'manutencao')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'em_revisao')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS community_posts_feed_idx
  ON public.community_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_user_idx
  ON public.community_posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL
    CHECK (reason IN ('ofensivo', 'propaganda', 'dados_pessoais', 'falso', 'outro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_posts, public.community_reports FROM anon, authenticated;
GRANT ALL ON public.community_posts, public.community_reports TO service_role;

-- Mural: aprovadas de todos + as minhas (com o status), sem revelar autor.
CREATE OR REPLACE FUNCTION public.community_feed()
RETURNS TABLE (
  id uuid,
  topic text,
  content text,
  status text,
  created_at timestamptz,
  mine boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.topic, p.content, p.status, p.created_at, p.user_id = auth.uid()
  FROM public.community_posts p
  WHERE auth.uid() IS NOT NULL
    AND (p.status = 'aprovada' OR p.user_id = auth.uid())
  ORDER BY p.created_at DESC
  LIMIT 100;
$$;

-- Barreira automática 1: palavrões, ofensas, discriminação e ameaças são recusados na hora.
-- (A barreira 2 é a revisão por IA no servidor; a 3 é a aprovação do admin.)
-- Compara sem acentos e sem diferenciar maiúsculas; palavras inteiras.
CREATE OR REPLACE FUNCTION public.community_text_blocked(_text text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(lower(coalesce(_text, '')),
                   'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
    ~ ('\m(' || array_to_string(ARRAY[
      -- palavrões e grosserias
      'porra', 'caralho', 'merda', 'bosta', 'foda', 'fodase', 'foda se', 'foder', 'fodido',
      'fdp', 'puta', 'puto', 'putaria', 'cu', 'cuzao', 'arrombad[oa]s?', 'buceta', 'pau no cu',
      'vai se fuder', 'vai tomar no cu', 'vtnc', 'tnc', 'pqp', 'krl', 'crl',
      -- ofensas pessoais
      'filh[oa] da puta', 'desgracad[oa]s?', 'vagabund[oa]s?', 'otari[oa]s?', 'babaca',
      'imbecil', 'retardad[oa]s?', 'idiota', 'corno', 'piranha', 'vadia', 'lixo humano',
      -- termos discriminatórios
      'viado', 'veado', 'bicha', 'traveco', 'sapatao', 'macaco imundo', 'crioulo', 'favelado',
      -- violência e ameaça
      'vou te matar', 'te matar', 'matar voce', 'vou matar', 'mata ele', 'mata ela',
      'meter bala', 'dar um tiro', 'quebrar a cara', 'estuprar?', 'estupro'
    ], '|') || ')\M');
$$;

CREATE OR REPLACE FUNCTION public.community_publish(_topic text, _content text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _text text := btrim(regexp_replace(coalesce(_content, ''), '\s+', ' ', 'g'));
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para compartilhar.';
  END IF;
  IF _topic IS NULL OR _topic NOT IN ('consumo', 'economia', 'precos', 'manutencao') THEN
    RAISE EXCEPTION 'Escolha um tema para a dica.';
  END IF;
  IF char_length(_text) < 10 OR char_length(_text) > 500 THEN
    RAISE EXCEPTION 'A dica precisa ter entre 10 e 500 caracteres.';
  END IF;
  IF _text ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|br|io|me|ly|app|site|online|link)\M)' THEN
    RAISE EXCEPTION 'Links não são aceitos na comunidade.';
  END IF;
  IF public.community_text_blocked(_text) THEN
    RAISE EXCEPTION 'Sua dica tem palavras que não são aceitas na comunidade. Reveja o texto e tente de novo.';
  END IF;
  IF (SELECT count(*) FROM public.community_posts
      WHERE user_id = _uid AND created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'Você já compartilhou 5 dicas nas últimas 24 horas. Tente amanhã.';
  END IF;
  INSERT INTO public.community_posts (user_id, topic, content)
  VALUES (_uid, _topic, _text)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_delete(_post_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.community_posts WHERE id = _post_id AND user_id = auth.uid();
$$;

-- Denúncia: uma por pessoa por publicação; tira a publicação do ar até nova revisão.
CREATE OR REPLACE FUNCTION public.community_report(_post_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para denunciar.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE id = _post_id AND status = 'aprovada' AND user_id <> _uid
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.community_reports (post_id, reporter_id, reason)
  VALUES (_post_id, _uid, _reason)
  ON CONFLICT (post_id, reporter_id) DO NOTHING;
  UPDATE public.community_posts SET status = 'em_revisao' WHERE id = _post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.community_text_blocked(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_feed() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_publish(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_delete(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_publish(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_report(uuid, text) TO authenticated;
