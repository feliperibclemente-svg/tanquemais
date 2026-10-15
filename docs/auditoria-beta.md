# Tanque+ — Auditoria técnica pré-beta (outubro/2026)

Referência para quem mexer nos cálculos, na TanqueIA ou nos lembretes. Os exemplos abaixo
estão automatizados em `tests/unit/calculations.test.ts`.

## 1. Fórmulas

Unidades: km, litros (L) — ou m³ para GNV —, reais (R$). Todos os cálculos ficam em
`src/services/analytics.ts`; as telas só exibem.

| Indicador | Fórmula | Entradas | Período | Limitações |
|---|---|---|---|---|
| **Consumo do trecho** | km entre dois tanques cheios ÷ litros colocados depois do primeiro (parciais + o que completou) | odômetro, litros, "tanque cheio" | um trecho | Exige dois tanques cheios; fora de 3–40 km/L é descartado como erro de digitação |
| **Consumo médio** | Σ km medidos ÷ Σ litros dos trechos que terminaram com o combustível mais recente | trechos válidos | todo o histórico do veículo principal | Gasolina e etanol nunca se misturam; trechos atípicos ficam fora |
| **Combustível por km** | Σ valor pago nos trechos medidos ÷ Σ km medidos | trechos válidos (todos os combustíveis) | todo o histórico | Só combustível: não inclui manutenção, impostos, seguro, parcelas |
| **Preço médio** | Σ valor pago ÷ Σ litros (ponderado pelo volume) | abastecimentos do combustível mais recente | todo o histórico | Ex.: 40 L a R$ 6 + 10 L a R$ 5 = R$ 5,80/L (a média aritmética daria R$ 5,50) |
| **Preço habitual (veredito)** | mediana dos últimos 5 preços do mesmo combustível e veículo, entre R$ 2 e R$ 12 | registros anteriores ao avaliado | 90 dias | Precisa de 3 referências; compara com o próprio usuário, não com o mercado |
| **Gasto no mês** | Σ valor pago desde o dia 1º do mês atual | abastecimentos do veículo principal | mês de calendário, horário local | Comparação com o mês anterior usa o mesmo número de dias |

Exemplo verificável: 10.000 km (tanque cheio, 40 L a R$ 6) → 10.480 km (tanque cheio, 40 L a
R$ 6) = 480 km ÷ 40 L = **12 km/L** e R$ 240 ÷ 480 km = **R$ 0,50/km**.

## 2. Qualidade dos dados

`computeFuelings` marca cada registro com `issue`:

- **duplicate** — mesmo veículo, km, litros e valor do registro anterior. Fica fora de gasto,
  consumo e custo por km. Antes, um duplicado dobrava os litros do trecho seguinte
  (12 → 6 km/L; custo por km +50%) — causa provável de valores como R$ 1,57/km.
- **odometer** — km menor ou igual ao anterior. Os litros contam; o km não é usado.
- **outlier** — consumo 50% acima ou abaixo da mediana do veículo no mesmo combustível
  (com ≥ 4 trechos). Costuma indicar abastecimento não registrado ou tanque não completado.
  Aparece no histórico, fora das médias.

## 3. TanqueIA

- Os fatos são calculados **no servidor** (`src/lib/tanque-ia.functions.ts`) a partir dos
  registros lidos com a sessão do usuário (RLS). O navegador não envia texto.
- A IA só reescreve. `src/services/tanque-ia-guard.ts` recusa a frase se citar número que
  não está nos fatos ou falar em economia, previsão ou promessa sem base nos fatos.
- O caso "economizar R$ 2.980 em 1.900 km": o fato original era *gasto observado* nos km
  medidos; a IA o chamou de economia. Agora isso é recusado e o texto calculado aparece.
- Ainda não existe referência externa de preço; por isso o app não fala em "economia
  potencial". Com a média da ANP por cidade, isso poderá ser feito com referência explícita.

## 4. Lembretes e localização — viabilidade

O Tanque+ é uma **PWA** (aplicação web instalável), não um app nativo.

| Opção | Viável hoje? | Observações |
|---|---|---|
| Detecção automática de parada em posto | **Não** | Navegadores não oferecem geofencing nem localização em segundo plano; também não há base confiável de postos. Exigiria app nativo (ex.: Capacitor), permissão de localização "sempre", limite de regiões monitoradas (iOS ~20, Android ~100), revisão de privacidade/LGPD e de bateria |
| Lembrete dentro do app pelo intervalo habitual | **Sim — implementado** | `fuelingReminder()`; sem permissões; aparece só ao abrir o app |
| Atalho "Abastecer" no ícone | **Sim — implementado** | `manifest.webmanifest` |
| Notificação push agendada ("faz 9 dias…") | Sim, com infraestrutura | Android: PWA com service worker. iPhone: só com o app instalado na tela inicial (iOS 16.4+). Requer service worker, chaves VAPID, tabela de inscrições, tarefa agendada no servidor, tela de ativação voluntária e opção de desativar |

Regras de produto para qualquer lembrete: ativação voluntária com explicação antes da
permissão; nunca pedir localização junto com notificação; no máximo um lembrete por
intervalo; nada que exija resposta enquanto a pessoa dirige; nunca preencher dados
automaticamente.

## 5. Segurança — pendências

1. **Dependências** (`npm audit` no `package-lock.json`): 12 alertas; os de nível alto estão
   no servidor MCP (`@modelcontextprotocol/sdk`, `@lovable.dev/mcp-js`, `proxy-addr`,
   `fast-uri`). O `bun.lock` (usado no build) já tem `seroval` corrigido. Atualizar pelo
   Lovable ou desligar a rota `/mcp` durante o beta.
2. **Dois lockfiles** (`bun.lock` e `package-lock.json`) divergem; manter só o que o
   Lovable usa.
3. **Tamanho da foto do perfil**: o app reduz para ~256 px, mas o banco aceita qualquer
   tamanho. Migration sugerida:
   ```sql
   ALTER TABLE public.profiles
     ADD CONSTRAINT profiles_avatar_size_check
     CHECK (avatar_url IS NULL OR length(avatar_url) <= 200000);
   ```
4. **LGPD**: política e termos revisados tecnicamente; a validação jurídica continua
   pendente.

## 6. Próximas etapas sugeridas

- **Despesas do veículo**: tabela `vehicle_expenses` (categoria: manutenção, imposto,
  seguro, financiamento, outros; valor; data; veículo; recorrência). Manter combustível em
  `fuelings`; custo total por km = (combustível + operacionais) ÷ km do mesmo período;
  custos de propriedade (parcelas, depreciação) em indicador separado.
- **Referência de preço**: média semanal da ANP por município (verificar licença e formato).
- **Comunidade**: tabelas existentes (`stations`, `station_prices`, `price_history`) estão
  bloqueadas. Antes de abrir: busca por raio (PostGIS ou `earthdistance`), confirmação e
  expiração de preços, limite de envios por usuário, moderação e campo que identifique
  conteúdo patrocinado.
