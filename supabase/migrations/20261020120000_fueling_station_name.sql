-- "Onde você pagou menos": nome do posto digitado pela própria pessoa (opcional).
-- Texto livre e privado, como o resto do abastecimento (mesma RLS de fuelings).
-- Não usa a tabela stations, que guarda postos de exemplo do protótipo.

ALTER TABLE public.fuelings ADD COLUMN IF NOT EXISTS station_name text;

ALTER TABLE public.fuelings DROP CONSTRAINT IF EXISTS fuelings_station_name_len;
ALTER TABLE public.fuelings ADD CONSTRAINT fuelings_station_name_len
  CHECK (station_name IS NULL OR char_length(btrim(station_name)) BETWEEN 1 AND 60);
