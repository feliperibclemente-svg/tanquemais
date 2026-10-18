# Tanque+ — domínio, DNS e serviços (fora do Lovable)

Referência para configurar e conferir a infraestrutura. Nada aqui é segredo: são valores
públicos (ficam visíveis no próprio DNS). **Senhas, secrets e chaves `sb_secret_` / `GOCSPX-` /
`AIza…` / `re_…` nunca entram neste arquivo nem no chat** — só nos painéis.

## Onde está cada coisa

| Serviço | Para quê | Identificação |
|---|---|---|
| registro.br | domínio `tanquemais.com.br` (DNS do Registro.br, modo avançado) | conta do CPF do Felipe |
| Vercel | hospedagem; projeto `tanquemais-4haf` ligado ao GitHub (`main` = produção) | endereço técnico `tanquemais-4haf.vercel.app` |
| Supabase | banco, login, e-mails de autenticação | projeto `wmycarnjzzsgihktqbje` (região us-west-2) |
| Google Cloud | login com Google | projeto `tanque-mais`, client `1054484305630-j7ujt3boucnlv18j3nuu10sudpctj0p8` |
| Resend | envio de e-mails (`tanquemais.com.br`, região São Paulo) | conta do Felipe |

Endereço oficial do app: **https://www.tanquemais.com.br** (`tanquemais.com.br` redireciona para o www).

## Zona DNS no registro.br (modo avançado)

No registro.br o campo "Nome" já termina em `.tanquemais.com.br`; "@" não é aceito (deixar em
branco). TXT sem aspas.

| Tipo | Nome | Dados | Para quê |
|---|---|---|---|
| A | *(em branco)* | `216.198.79.1` | site (Vercel) |
| CNAME | `www` | `acc566848c0596d5.vercel-dns-017.com.` | site (Vercel) |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDL9ufs5T8WYnqmqLq7JHSNF9zAlMRpzauXuaSy3inzYU6pqY3tmxwb7xJtrTpiPU/kCy0yvDeqOiwTo/cC84WgiGl+p0hKUeM0WPdOhqWl07bhylMMw+UBLlZo2pMNYRrABkUtRkrL9FPu7fCab++X80W6y5evJ3S4mJjJc2DFPQIDAQAB` | e-mail: assinatura DKIM (Resend) |
| CNAME | `rsend` | `rsend-sae1.forge.rmta.net` | e-mail: envio (Resend) |
| CNAME | `send` | `send.forge.rmta.net` | e-mail: envio (Resend) |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | e-mail: reputação (evita spam) |

Se a Vercel ou o Resend mostrarem valores diferentes no painel, **vale o do painel**.
Valores alternativos da Vercel que também funcionam: A `76.76.21.21` e CNAME `cname.vercel-dns.com`.

## Variáveis de ambiente na Vercel

| Nome | Valor | Tipo |
|---|---|---|
| `SUPABASE_URL` | `https://wmycarnjzzsgihktqbje.supabase.co` | normal |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_NXMIz3efv1VmZJ8VD6ycpw_Y2u9AGgQ` | normal |
| `VITE_SUPABASE_URL` | `https://wmycarnjzzsgihktqbje.supabase.co` | config (não secret) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_NXMIz3efv1VmZJ8VD6ycpw_Y2u9AGgQ` | config (não secret) |
| `VITE_SUPABASE_PROJECT_ID` | `wmycarnjzzsgihktqbje` | config (não secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `sb_secret_…` do Supabase | **secret** |
| `CRON_SECRET` | texto aleatório longo (protege a importação diária da ANP) | **secret** |
| `AI_API_KEY` | chave do Google AI Studio (`AIza…`) — frase do Teo | **secret** |

Opcionais: `AI_MODEL` (padrão `gemini-flash-latest`, que acompanha o Flash estável mais recente), `AI_BASE_URL` (outro provedor compatível).
Build: `vercel.json` (bun + `NITRO_PRESET=vercel`). Depois de mudar variável: **Redeploy**.

## Checklist do domínio novo

- [ ] registro.br: zona DNS com as 6 entradas acima (liberou após a "transição" de ~2h)
- [ ] Vercel → Domains: `tanquemais.com.br` e `www.tanquemais.com.br` em **Valid Configuration**
- [ ] Resend → Domains: `tanquemais.com.br` **Verified**
- [ ] Supabase → Authentication → URL Configuration:
  - Site URL: `https://www.tanquemais.com.br`
  - Redirect URLs: `https://www.tanquemais.com.br/**` (manter também `https://tanquemais-4haf.vercel.app/**`)
- [ ] Google Cloud → client → Authorized JavaScript origins: adicionar `https://www.tanquemais.com.br`
  (o redirect URI continua `https://wmycarnjzzsgihktqbje.supabase.co/auth/v1/callback`)
- [ ] Google Cloud → OAuth consent screen → Branding: links de privacidade/termos e domínio autorizado `tanquemais.com.br`
- [ ] Supabase → Authentication → Emails → SMTP Settings (Resend):
  - Host `smtp.resend.com`, porta `465`, usuário `resend`, senha = API key do Resend (`re_…`, só no painel)
  - Remetente `nao-responda@tanquemais.com.br`, nome `Tanque+`
- [ ] Supabase → Authentication → Emails → Templates: e-mails em português (`supabase/templates/README.md`)
- [ ] Supabase → Authentication → Rate Limits: aumentar o limite de e-mails por hora (ex.: 100)
- [ ] Teste: criar conta com e-mail novo, receber confirmação, entrar com Google em `www.tanquemais.com.br`

## Pendências de segurança

- [ ] Google: gerar novo client secret (Add secret), colar no Supabase e desativar os que apareceram no chat
- [ ] Google: excluir o client sobrando `1054484305630-p72m0lk3fr3ejtpquh505balpkhqk83v`
- [x] Supabase: senha do banco trocada
- [ ] Lovable: despublicar `tanquemais.lovable.app` (banco antigo) quando o domínio novo estiver no ar

## Preços de referência (ANP)

- Tabela `fuel_price_references` (migration `20261017200000_fuel_price_references.sql`).
- Importação diária às 10h17 (Vercel Cron → `/api/cron/diario`, exige `CRON_SECRET`); a ANP publica às terças.
- Painel admin → "Preços de referência (ANP)" → **Atualizar agora** para importar na hora e ver o resultado.
- Só aparece para quem tem **cidade e UF** no perfil (cidade fora da pesquisa usa a média do estado).
