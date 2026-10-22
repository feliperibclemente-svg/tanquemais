-- Preços por posto da pesquisa semanal da ANP (arquivo "Preços por posto revendedor").
-- Dado público (posto, endereço, preço coletado). Legível por quem está logado e gravado
-- só pelo servidor. Guardamos só as 2 semanas mais recentes (o importador apaga as antigas).

CREATE TABLE IF NOT EXISTS public.fuel_station_prices (
  id bigserial PRIMARY KEY,
  source text NOT NULL DEFAULT 'ANP',
  week_start date NOT NULL,
  week_end date NOT NULL,
  uf text NOT NULL,
  municipio text NOT NULL,
  cnpj text NOT NULL,
  name text NOT NULL,
  address text,
  bairro text,
  brand text,
  fuel_type_id text NOT NULL REFERENCES public.fuel_types(id),
  price numeric(8,3) NOT NULL CHECK (price > 0 AND price < 50),
  collected_on date,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, week_start, cnpj, fuel_type_id)
);

CREATE INDEX IF NOT EXISTS fuel_station_prices_lookup_idx
  ON public.fuel_station_prices (uf, municipio, fuel_type_id, week_start DESC, price);

ALTER TABLE public.fuel_station_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "station prices readable by signed-in users" ON public.fuel_station_prices;
CREATE POLICY "station prices readable by signed-in users" ON public.fuel_station_prices
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.fuel_station_prices FROM anon, authenticated;
GRANT SELECT ON public.fuel_station_prices TO authenticated;
GRANT ALL ON public.fuel_station_prices TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.fuel_station_prices_id_seq TO service_role;
