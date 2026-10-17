import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Action, ActionLink, ScreenSkeleton, TextField } from "@/components/ds";
import { BrandMark } from "@/components/app/Logo";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { track } from "@/lib/analytics";
import { useAuth } from "@/providers/AuthProvider";

export const Route = createFileRoute("/nova-senha")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Criar nova senha — Tanque+" }, { name: "robots", content: "noindex" }],
  }),
  component: NewPasswordPage,
});

/**
 * Destino do link "Esqueci minha senha". O link abre uma sessão temporária de recuperação;
 * aqui a pessoa define a nova senha e segue para o app.
 */
function NewPasswordPage() {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password.length > 72) return setError("Use no máximo 72 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(authErrorMessage(updateError.message));
    track("auth_password_reset_done");
    toast.success("Senha atualizada.");
    window.location.replace("/app");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <BrandMark className="mx-auto h-14" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Criar nova senha
        </h1>
      </div>

      {loading ? (
        <ScreenSkeleton cards={1} />
      ) : !session ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Este link expirou ou já foi usado. Para receber outro, toque em “Esqueci minha senha” na
            tela de entrada.
          </p>
          <ActionLink to="/auth">Voltar para entrar</ActionLink>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <TextField
            id="new-password"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
          />
          <TextField
            id="confirm-password"
            label="Repita a nova senha"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <Action type="submit" loading={busy} disabled={busy}>
            Salvar nova senha
          </Action>
        </form>
      )}
    </div>
  );
}
