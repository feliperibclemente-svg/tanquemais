<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Usage events are batched client-side into `public.events` (insert-only RLS, no PII); why: product analytics without a third-party tracker.
- Account deletion runs in an authenticated server function using the service-role client; why: users must be able to erase their data (LGPD) without admin help.
- Fueling ids are generated on the device and inserted via upsert(ignoreDuplicates); why: offline retries must never duplicate records.
