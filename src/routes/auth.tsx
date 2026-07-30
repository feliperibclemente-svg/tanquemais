import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Action, TextField } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/providers/AuthProvider";
import { authSchema } from "@/validators";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar no Tanque+" },
      {
        name: "description",
        content: "Acesse sua conta do Tanque+ para acompanhar consumo, gastos e economia.",
      },
      { property: "og:title", content: "Entrar no Tanque+" },
      { property: "og:description", content: "Entre com Google, Apple ou e-mail." },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

function goTo(destination: string) {
  window.location.replace(destination);
}

function AuthPage() {
  const { user, loading } = useAuth();

  const search = useSearch({ from: "/auth" });
  const destination = safePath(search.redirect);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "apple">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) goTo(destination);
  }, [loading, user, destination]);

  async function signInWith(provider: "google" | "apple") {
    setBusy(provider);
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}${destination}`,
    });
    if ("error" in result && result.error) {
      setBusy(null);
      setError("Não foi possível entrar com esse provedor. Tente novamente.");
      return;
    }
    if ("redirected" in result && result.redirected) return;
    goTo(destination);
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    const parsed = authSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setBusy("email");
    setError(null);

    const response =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(parsed.data)
        : await supabase.auth.signUp({
            ...parsed.data,
            options: { emailRedirectTo: `${window.location.origin}${destination}` },
          });

    setBusy(null);

    if (response.error) {
      setError(
        response.error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : response.error.message,
      );
      return;
    }

    if (mode === "signup" && !response.data.session) {
      toast.success("Confira seu e-mail para confirmar a conta.");
      return;
    }

    goTo(destination);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-xl font-bold text-primary-foreground">
          T
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          {mode === "signin" ? "Bem-vindo de volta" : "Criar sua conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus abastecimentos, consumo e economia em um só lugar.
        </p>
      </div>

      <div className="space-y-3">
        <Action
          variant="secondary"
          onClick={() => signInWith("google")}
          disabled={busy !== null}
          loading={busy === "google"}
        >
          {busy === "google" ? null : <GoogleMark />}
          Continuar com Google
        </Action>
        <Action
          variant="secondary"
          onClick={() => signInWith("apple")}
          disabled={busy !== null}
          loading={busy === "apple"}
        >
          {busy === "apple" ? null : <AppleMark />}
          Continuar com Apple
        </Action>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou com e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submitEmail} className="space-y-3">
        <TextField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
        <TextField
          id="password"
          label="Senha"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo de 8 caracteres"
        />

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Action type="submit" disabled={busy !== null} loading={busy === "email"}>
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </Action>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-5 min-h-11 text-sm text-muted-foreground"
      >
        {mode === "signin" ? (
          <>
            Ainda não tem conta? <span className="font-semibold text-primary">Criar conta</span>
          </>
        ) : (
          <>
            Já tem conta? <span className="font-semibold text-primary">Entrar</span>
          </>
        )}
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M16.4 12.7c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.2 1-4.1 2.5-1.7 3-.4 7.4 1.3 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-.9-2.4-3.8ZM14 4.9c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
    </svg>
  );
}
