# E-mails de autenticação (Supabase → Authentication → Emails → Templates)

Copie o conteúdo de cada arquivo para o template correspondente e use o assunto indicado.

| Template no Supabase | Assunto | Arquivo |
|---|---|---|
| Confirm signup | Confirme seu cadastro no Tanque+ | `confirmacao-cadastro.html` |
| Reset password | Crie uma nova senha no Tanque+ | `recuperar-senha.html` |
| Change email address | Confirme seu novo e-mail no Tanque+ | `troca-email.html` |
| Magic link | Seu link de acesso ao Tanque+ | `link-de-acesso.html` |

O link de "Reset password" leva para `/nova-senha` (o app envia esse endereço ao pedir a troca).
As variáveis `{{ .ConfirmationURL }}`, `{{ .Email }}` e `{{ .NewEmail }}` são preenchidas pelo Supabase.
