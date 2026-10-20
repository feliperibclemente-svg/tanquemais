-- Auditoria técnica (R1): o abastecimento só pode apontar para um veículo do próprio usuário.
-- Antes, a regra conferia só user_id; com o UUID do veículo de outra pessoa dava para
-- gravar nele e o gatilho de estatísticas alterava o odômetro e as estatísticas dela.
-- Mesmo padrão já usado em vehicle_checkups. Leitura e exclusão não mudam.

DROP POLICY IF EXISTS "own fuelings" ON public.fuelings;
CREATE POLICY "own fuelings" ON public.fuelings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = fuelings.vehicle_id AND v.user_id = auth.uid()
    )
  );
