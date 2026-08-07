# Tanque+

Assistente inteligente de economia automotiva: registre abastecimentos em segundos, acompanhe o consumo do veículo, compare preços de postos e receba insights da **TanqueIA**.

## Arquitetura

- **TanStack Start (React 19 + Vite 7)** com rotas em `src/routes`. Rotas privadas ficam sob `src/routes/_authenticated/`.
- **Lovable Cloud (Postgres + Auth)** é a **única fonte de verdade**: perfil, veículos, abastecimentos, postos, preços, estatísticas e insights. Não há dados fictícios nem persistência local de domínio.
- **Camadas**
  - `src/repositories` — acesso a dados tipado, com erros traduzidos (`base.ts`).
  - `src/services` — regras de negócio puras (`analytics.ts`, `insights.ts`).
  - `src/hooks/use-tanque.ts` — TanStack Query (queries, mutations, invalidações).
  - `src/components/ds` — design system (Action, campos, confirmação, skeletons).
  - `src/lib` — formatação, geo, analytics, telemetria e fila offline.
- **Segurança**: RLS habilitada em todas as tabelas, políticas por `auth.uid()`, papéis em `user_roles` com `has_role()`.

## Offline

`src/lib/offline-queue.ts` é apenas um **buffer temporário**: quando não há rede, o abastecimento fica no aparelho e é reenviado automaticamente ao voltar a conexão (`src/hooks/use-offline-sync.ts`). Nada é lido do dispositivo como fonte de dados — apenas o tema visual é lembrado localmente.

## TanqueIA

`src/services/insights.ts` gera recomendações determinísticas a partir dos dados reais do usuário; `src/lib/tanque-ia.functions.ts` complementa com o gateway de IA quando necessário.

## Agentes (MCP)

Servidor MCP em `src/lib/mcp` com ferramentas que consultam o banco real: postos e preços, posto mais barato, gasolina x etanol, cálculo de consumo e clubes. Requer login (OAuth 2.1).

## Desenvolvimento

```sh
npm i
npm run dev
```

Comandos úteis: `npm run build`, `npm run lint`.

## Estados vazios

Funcionalidades sociais (clubes, feed, ranking) leem exclusivamente o banco. Sem dados, o app mostra estados vazios elegantes em vez de conteúdo simulado.

## Testes de permissão (RLS/GRANTs)

`tests/rls` valida, via Data API real, o que cada tipo de usuário consegue ler:

- `smoke.test.ts` — invariantes críticos em poucos segundos (catálogo público, `reported_by` bloqueado, grafo social e dados pessoais inacessíveis).
- `anon.test.ts` — catálogo público legível; preços públicos sem `reported_by`; clubes, seguidores e dados pessoais bloqueados.
- `authenticated.test.ts` — usuário logado vê só as próprias linhas; membro de clube vê só rosters de clubes onde participa; seguidor vê só relações em que participa.

```sh
npm test
```

Os cenários autenticados só rodam com credenciais de teste no ambiente (`TANQUE_TEST_EMAIL_A`/`TANQUE_TEST_PASSWORD_A` e `TANQUE_TEST_EMAIL_B`/`TANQUE_TEST_PASSWORD_B`); sem elas são pulados.

### CI (GitHub Actions)

`.github/workflows/rls-tests.yml`:

- **Todo pull request / push**: job `Smoke RLS` (~alguns segundos) com os invariantes críticos.
- **Semanal (segunda, 06:00 UTC), manual (`workflow_dispatch`) e push na `main`**: suíte completa em matriz paralela (`anon` + `authenticated`, `fail-fast: false`).
- **Cache**: `~/.bun/install/cache` por hash do lockfile.
- **Retry**: cada suíte é reexecutada uma vez em caso de falha; os relatórios das duas tentativas são mantidos (`*-attempt1`, `*-attempt2`) para diagnosticar flakiness — o resumo marca quando houve retry.
- **Relatórios**: JUnit em `reports/junit-<suite>-attempt<N>.xml`, publicados como artefatos (`rls-report-*`, retenção 14–30 dias).
- **Comentário no PR**: o job agregador roda `scripts/rls-summary.ts` e publica/atualiza um comentário fixo com tabela de pass/fail, duração, testes que falharam e link para os artefatos.
- **Slack**: se `SLACK_WEBHOOK_URL` estiver configurado, uma mensagem é enviada sempre que o RLS falhar (PR, push ou execução agendada). Sem o secret, a etapa é ignorada.
- **Status check único**: o job `Permissões de leitura (GRANTs + RLS)` falha se qualquer suíte falhar — use-o na proteção de branch.

Configure em **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (podem ser _variables_, são públicas)
- opcionalmente `TANQUE_TEST_EMAIL_A/B` e `TANQUE_TEST_PASSWORD_A/B` como _secrets_, para habilitar os cenários autenticados
- opcionalmente `SLACK_WEBHOOK_URL` (Incoming Webhook do Slack) para os alertas de falha


### Bloquear merges com regressão (proteção de branch)

Isso é uma configuração do GitHub e precisa ser feita no repositório (não pode ser aplicada pelo código):

1. **Settings → Rules → Rulesets → New branch ruleset** (ou **Branches → Add branch protection rule**).
2. Alvo: branch padrão (`main`).
3. Marque **Require a pull request before merging**.
4. Marque **Require status checks to pass** → **Require branches to be up to date** e adicione o check **`Permissões de leitura (GRANTs + RLS)`**.
5. Salve. O check só aparece na busca depois que o workflow rodar ao menos uma vez na branch/PR.

