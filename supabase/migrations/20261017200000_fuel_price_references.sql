-- Preços de referência públicos (ANP — Levantamento de Preços de Combustíveis).
-- Médias semanais por município e por estado. Não há dado pessoal: é informação pública,
-- legível por quem está logado e gravada só pelo servidor (service_role).

CREATE TABLE IF NOT EXISTS public.fuel_price_references (
  id bigserial PRIMARY KEY,
  source text NOT NULL DEFAULT 'ANP',
  week_start date NOT NULL,
  week_end date NOT NULL,
  scope text NOT NULL CHECK (scope IN ('municipio', 'estado')),
  uf text NOT NULL,
  municipio text NOT NULL DEFAULT '',
  municipio_label text,
  fuel_type_id text NOT NULL REFERENCES public.fuel_types(id),
  avg_price numeric(8,3) NOT NULL CHECK (avg_price > 0 AND avg_price < 50),
  min_price numeric(8,3),
  max_price numeric(8,3),
  stations integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, week_start, scope, uf, municipio, fuel_type_id)
);

CREATE INDEX IF NOT EXISTS fuel_price_references_lookup_idx
  ON public.fuel_price_references (uf, municipio, fuel_type_id, week_start DESC);

ALTER TABLE public.fuel_price_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price references readable by signed-in users" ON public.fuel_price_references;
CREATE POLICY "price references readable by signed-in users" ON public.fuel_price_references
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.fuel_price_references FROM anon, authenticated;
GRANT SELECT ON public.fuel_price_references TO authenticated;
GRANT ALL ON public.fuel_price_references TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fuel_price_references_id_seq TO service_role;
