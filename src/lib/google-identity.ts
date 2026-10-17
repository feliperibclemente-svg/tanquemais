import { GOOGLE_CLIENT_ID } from "@/constants/app";

/**
 * Login com Google dentro do próprio app (Google Identity Services). Assim a tela do Google
 * mostra o endereço do Tanque+, e não o do servidor do banco. O token recebido é trocado
 * por uma sessão no Supabase (signInWithIdToken). Se o script do Google não carregar, o app
 * usa o login por redirecionamento (src/lib/oauth.ts).
 */

type CredentialResponse = { credential?: string };

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce?: string;
    ux_mode?: "popup" | "redirect";
    use_fedcm_for_button?: boolean;
    itp_support?: boolean;
  }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleId | null> | null = null;

/** Carrega o script do Google uma vez; devolve null se falhar ou demorar demais. */
export function loadGoogleIdentity(timeoutMs = 6000): Promise<GoogleId | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const done = (value: GoogleId | null) => {
      clearTimeout(timer);
      if (!value) loading = null;
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => done(window.google?.accounts?.id ?? null);
    script.onerror = () => done(null);
    document.head.appendChild(script);
  });
  return loading;
}

/** Nonce: o Google recebe o hash; o Supabase recebe o valor original e confere. */
export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

export const googleClientId = GOOGLE_CLIENT_ID;
