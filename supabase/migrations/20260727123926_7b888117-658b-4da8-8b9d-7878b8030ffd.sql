
-- tighten permissive policies
DROP POLICY "stations update by owner or admin" ON public.stations;
CREATE POLICY "stations update by owner or admin" ON public.stations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

DROP POLICY "clubs update owner" ON public.clubs;
CREATE POLICY "clubs update owner" ON public.clubs FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

DROP POLICY "prices update" ON public.station_prices;
CREATE POLICY "prices update" ON public.station_prices FOR UPDATE TO authenticated
  USING (true) WITH CHECK (auth.uid() = reported_by AND price > 0);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- ============ SEED: BADGES ============
INSERT INTO public.badges (id,name,description,icon,xp_reward,sort_order) VALUES
 ('primeiro_tanque','Primeiro Tanque','Registrou o primeiro abastecimento','fuel',50,1),
 ('economista','Economista','Economizou R$ 100 acumulados','piggy-bank',100,2),
 ('economista_ouro','Economista Ouro','Economizou R$ 1.000 acumulados','trophy',400,3),
 ('colaborador','Colaborador','Compartilhou 10 preços com a comunidade','users',150,4),
 ('sentinela','Sentinela de Preços','Confirmou 25 preços de postos','shield-check',200,5),
 ('regularidade','Regularidade','10 abastecimentos registrados','calendar-check',120,6),
 ('maratonista','Maratonista','5.000 km registrados','route',250,7),
 ('eficiente','Motorista Eficiente','Consumo 10% acima da média da cidade','leaf',200,8),
 ('explorador','Explorador','Abasteceu em 10 postos diferentes','map-pin',180,9),
 ('fotografo','Fotógrafo','Enviou 5 fotos de postos','camera',80,10),
 ('clubista','Clubista','Entrou em um clube','flag',40,11),
 ('influente','Influente','Recebeu 50 curtidas','heart',220,12)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: MISSIONS ============
INSERT INTO public.missions (id,title,description,period,goal,unit,xp_reward,active) VALUES
 ('semana_registro','Semana Registrada','Registre 2 abastecimentos nesta semana','weekly',2,'abastecimentos',80,true),
 ('semana_preco','Preço Colaborativo','Compartilhe 3 preços de postos nesta semana','weekly',3,'preços',100,true),
 ('semana_economia','Economista Semanal','Economize R$ 30 escolhendo postos mais baratos','weekly',30,'reais',120,true),
 ('mes_consistencia','Consistência Mensal','Registre 8 abastecimentos no mês','monthly',8,'abastecimentos',300,true),
 ('mes_km','Mês na Estrada','Registre 1.000 km no mês','monthly',1000,'km',250,true),
 ('mes_comunidade','Voz da Comunidade','Faça 5 avaliações ou comentários no mês','monthly',5,'interações',200,true)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: CLUBS ============
INSERT INTO public.clubs (id,slug,name,description,kind,city,members_count) VALUES
 ('11111111-0000-4000-8000-000000000001','fiat','Fiat Brasil','Donos de Fiat trocando consumo real e dicas de economia','brand',NULL,4820),
 ('11111111-0000-4000-8000-000000000002','volkswagen','Volkswagen','Consumo, manutenção e economia em VW','brand',NULL,5310),
 ('11111111-0000-4000-8000-000000000003','toyota','Toyota','Híbridos e flex Toyota','brand',NULL,3170),
 ('11111111-0000-4000-8000-000000000004','chevrolet','Chevrolet','Onix, Tracker e companhia','brand',NULL,4490),
 ('11111111-0000-4000-8000-000000000005','uber','Motoristas de App','Quem roda muito e precisa economizar mais','activity',NULL,7860),
 ('11111111-0000-4000-8000-000000000006','entregadores','Entregadores','Motos e utilitários no delivery','activity',NULL,3940),
 ('11111111-0000-4000-8000-000000000007','goiania','Goiânia','Preços e postos da capital goiana','city','Goiânia',2610),
 ('11111111-0000-4000-8000-000000000008','sao-paulo','São Paulo','A maior comunidade de preços do país','city','São Paulo',9120)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: STATIONS ============
INSERT INTO public.stations (id,name,brand,address,city,state,latitude,longitude,is_24h,has_convenience,rating,reviews_count,fillups_count,reliability_score) VALUES
 ('22222222-0000-4000-8000-000000000001','Posto Bandeirantes','Ipiranga','Av. T-63, 1200','Goiânia','GO',-16.7050,-49.2900,true,true,4.60,182,940,92),
 ('22222222-0000-4000-8000-000000000002','Auto Posto Serra Dourada','Shell','Av. 85, 2450','Goiânia','GO',-16.7020,-49.2650,true,true,4.40,143,760,88),
 ('22222222-0000-4000-8000-000000000003','Posto Cerrado','Petrobras','Av. Anhanguera, 5100','Goiânia','GO',-16.6800,-49.2550,false,false,4.10,96,420,74),
 ('22222222-0000-4000-8000-000000000004','Posto Economia GO','Bandeira branca','Av. Perimetral Norte, 800','Goiânia','GO',-16.6600,-49.2800,true,false,3.90,64,310,61),
 ('22222222-0000-4000-8000-000000000005','Posto Jardim América','Ale','Rua 90, 340','Goiânia','GO',-16.7100,-49.2720,false,true,4.30,77,280,69),
 ('22222222-0000-4000-8000-000000000006','Posto Paulista Center','Shell','Av. Paulista, 1500','São Paulo','SP',-23.5614,-46.6558,true,true,4.50,410,2100,95),
 ('22222222-0000-4000-8000-000000000007','Posto Ibirapuera','Ipiranga','Av. Ibirapuera, 2200','São Paulo','SP',-23.6100,-46.6660,true,true,4.20,318,1740,90),
 ('22222222-0000-4000-8000-000000000008','Posto Marginal Tietê','Petrobras','Marginal Tietê, km 20','São Paulo','SP',-23.5150,-46.6400,true,false,3.80,205,1320,82),
 ('22222222-0000-4000-8000-000000000009','Posto Vila Mariana','Ale','Rua Domingos de Morais, 900','São Paulo','SP',-23.5900,-46.6350,false,true,4.10,166,880,77),
 ('22222222-0000-4000-8000-00000000000a','Posto Lapa Econômico','Bandeira branca','Rua Guaicurus, 400','São Paulo','SP',-23.5250,-46.7000,false,false,3.70,88,410,63)
ON CONFLICT (id) DO NOTHING;

-- ============ SEED: STATION PRICES ============
INSERT INTO public.station_prices (station_id,fuel_type_id,price,confirmations) VALUES
 ('22222222-0000-4000-8000-000000000001','gasolina',5.699,14),
 ('22222222-0000-4000-8000-000000000001','etanol',3.899,11),
 ('22222222-0000-4000-8000-000000000001','diesel',5.999,6),
 ('22222222-0000-4000-8000-000000000002','gasolina',5.849,9),
 ('22222222-0000-4000-8000-000000000002','etanol',3.999,8),
 ('22222222-0000-4000-8000-000000000003','gasolina',5.759,5),
 ('22222222-0000-4000-8000-000000000003','etanol',3.949,4),
 ('22222222-0000-4000-8000-000000000004','gasolina',5.599,7),
 ('22222222-0000-4000-8000-000000000004','etanol',3.849,7),
 ('22222222-0000-4000-8000-000000000005','gasolina',5.789,3),
 ('22222222-0000-4000-8000-000000000005','gnv',4.299,3),
 ('22222222-0000-4000-8000-000000000006','gasolina',6.099,22),
 ('22222222-0000-4000-8000-000000000006','etanol',4.199,19),
 ('22222222-0000-4000-8000-000000000006','diesel',6.199,12),
 ('22222222-0000-4000-8000-000000000007','gasolina',5.989,17),
 ('22222222-0000-4000-8000-000000000007','etanol',4.099,15),
 ('22222222-0000-4000-8000-000000000008','gasolina',5.899,13),
 ('22222222-0000-4000-8000-000000000008','diesel',6.049,16),
 ('22222222-0000-4000-8000-000000000009','gasolina',6.049,8),
 ('22222222-0000-4000-8000-000000000009','etanol',4.149,6),
 ('22222222-0000-4000-8000-00000000000a','gasolina',5.849,4),
 ('22222222-0000-4000-8000-00000000000a','etanol',4.049,4)
ON CONFLICT (station_id, fuel_type_id) DO NOTHING;

-- ============ SEED: PRICE HISTORY (30 dias) ============
INSERT INTO public.price_history (station_id, fuel_type_id, price, created_at)
SELECT sp.station_id,
       sp.fuel_type_id,
       ROUND((sp.price * (1 + ((d % 7) - 3) * 0.004))::numeric, 3),
       now() - (d || ' days')::interval
FROM public.station_prices sp
CROSS JOIN generate_series(1, 30) AS d;
