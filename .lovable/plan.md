## Diagnóstico crítico do estado atual

Li o código antes de propor. O que encontrei:

1. **Duas fontes de verdade conflitantes.** O banco (23 tabelas, RLS, dados semeados) já existe, mas *nenhuma tela usa*. Todas as telas leem `localStorage` via `src/lib/tanque.ts` e dados fictícios em `src/lib/community.ts`. É a maior causa da "sensação de protótipo".
2. **Não há login.** Sem tela de autenticação, o banco é inalcançável. Esse é o bloqueio nº 1.
3. **Não existe design system real.** `MobileShell.tsx` (102 linhas) tem um `Card` e um `EmptyState` improvisados; cada tela reimplementa botões, espaçamentos e tipografia à mão. shadcn está instalado mas quase não é usado.
4. **Sem estados de carregamento.** Nenhum skeleton, nenhum toast, nenhuma animação de transição. Telas piscam entre vazio e cheio.
5. **Sem camadas.** Nada de `services`, `repositories`, `features`, `hooks`, `providers`. Regra de negócio, formatação e JSX moram no mesmo arquivo.
6. **Fluxo de abastecimento longo demais.** Formulário único, sem foco automático, sem teclado numérico, sem máscara — hoje leva bem mais de 20 s.

## Recomendações onde discordo do briefing (para proteger a experiência)

- **Comunidade/Radar/Clubes ficam de fora desta fase.** Hoje são 100% dados fictícios. Manter telas falsas ao lado de telas reais destrói a confiança. Proponho escondê-las do menu nesta fase e trazê-las de volta na Fase 2 já ligadas ao banco. A navegação inferior fica com 5 itens reais: Home, Histórico, Abastecer (centro), Dashboard, Perfil.
- **Não vou criar as tabelas de novo.** Elas já existem e estão corretas; só adiciono índices, trigger de `updated_at` e trigger de criação de perfil no cadastro.
- **Página do veículo em vez de `economia.tsx`.** A tela de economia duplica o Dashboard; os números dela migram para a Home e para o Dashboard.
- **Offline: fila de gravação, não app offline completo.** Abastecimento registrado sem rede fica numa fila local e sincroniza depois. App inteiro offline é escopo de outra fase.

## O que será construído

**1. Fundação — autenticação e camadas**
- Tela `/auth` com Google, Apple e e-mail/senha; provider de sessão; rotas privadas sob `_authenticated`.
- Estrutura: `features/`, `repositories/`, `services/`, `hooks/`, `providers/`, `layouts/`, `components/ui`.
- Repositórios tipados para perfis, veículos, abastecimentos e postos; hooks TanStack Query com cache, retry e invalidação.
- Onboarding: cria perfil e primeiro veículo direto no banco. Migração automática dos dados de `localStorage` na primeira entrada.

**2. Design system**
- Tokens unificados em `styles.css`: escala tipográfica, raio único, uma sombra, espaçamentos, altura de card padrão.
- Componentes: `Button`, `Card`, `Input` (com máscara BRL/km), `Select`, `Sheet`, `Dialog`, `Toast` (sonner), `Badge`, `Spinner`, `Skeleton`, `EmptyState`, `Stat`, `SectionHeader`.
- Regras de acessibilidade: alvo mínimo 44 px, foco visível, rótulos e contraste AA.

**3. Home de ação**
Saudação → card "Economia possível hoje" com botão → gasto do mês com minigráfico e comparação → card grande da TanqueIA (nunca vazio) → último abastecimento → botão flutuante de registrar.

**4. Fluxo de abastecimento em etapas**
Veículo → valor pago → preço/litro → odômetro → combustível → confirmar. Um campo por vez, teclado numérico, litros calculados sozinhos, animação de sucesso e resultado imediato (km/L, litros, custo/km, economia). Meta: menos de 20 s.

**5. Dashboard e Histórico**
- Dashboard: consumo médio, preço médio, maior/menor consumo, custo/km, economia e comparação mensal, com gráficos redesenhados e carregados sob demanda.
- Histórico vira timeline agrupada por mês, com card por abastecimento.

**6. Página do veículo**
Ilustração, ficha técnica, quilometragem, total abastecido, gasto, maior/menor consumo e autonomia — a partir de `vehicle_statistics`.

**7. TanqueIA híbrida**
Toda a matemática numa server function (`services/analytics`); a IA (Lovable AI) apenas redige o texto sobre números prontos. Se a IA falhar ou demorar, aparecem os insights calculados. A IA nunca gera números.

**8. Qualidade**
Error boundary global, página 404, aviso de offline, skeletons em todas as rotas, toasts em toda ação, validação Zod em todos os formulários, code splitting das telas pesadas.

## Detalhes técnicos

- Estatísticas de usuário e veículo recalculadas por trigger no banco a cada abastecimento — a Home lê valores prontos, sem cálculo no cliente.
- Índices: `fuelings(user_id, filled_at desc)`, `fuelings(vehicle_id, odometer)`, `vehicles(user_id)`, `station_prices(station_id, fuel_type_id)`, `stations(city)`.
- Leituras protegidas via `createServerFn` + `requireSupabaseAuth`; rotas privadas sob `src/routes/_authenticated/`.
- Fila offline em IndexedDB, drenada por mutation do TanStack Query ao voltar a conexão.

## Ordem de entrega

1. Migração (índices + triggers + perfil no cadastro)
2. Auth + camadas + design system
3. Home + fluxo de abastecimento
4. Histórico + Dashboard + Veículo + Perfil
5. TanqueIA híbrida + offline + polimento e verificação no navegador

Vou executar tudo em sequência nesta sprint, checando o app no navegador ao final de cada bloco.