> [!IMPORTANT]
> Hosted on Vercel (project `tanquemais-4haf`, domain www.tanquemais.com.br); every push to
> `main` deploys to production, so keep `main` working and don't rewrite published history.
> Database/auth: own Supabase project `wmycarnjzzsgihktqbje`. The project no longer uses Lovable.
> Infra reference: `docs/lancamento/dns-e-servicos.md`. Schema for a fresh database:
> `supabase/setup/tanquemais-banco-completo.sql` (append new migrations there too).
- Usage events are batched client-side into `public.events` (insert-only RLS, no PII); why: product analytics without a third-party tracker.
- Account deletion runs in an authenticated server function using the service-role client; why: users must be able to erase their data (LGPD) without admin help.
- Fueling ids are generated on the device and inserted via upsert(ignoreDuplicates); why: offline retries must never duplicate records.
