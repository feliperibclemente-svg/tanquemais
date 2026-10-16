import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export type OAuthProvider = "google" | "apple";

/**
 * No Lovable, o login social passa pelo intermediário deles (que só existe nos domínios
 * do Lovable). Fora dele (Vercel, domínio próprio), usa o login direto do Supabase, com
 * as credenciais configuradas no painel do projeto.
 */
export function isLovableHost() {
  if (typeof window === "undefined") return false;
  return /(^|\.)lovable\.(app|dev)$|(^|\.)lovableproject\.com$/.test(window.location.hostname);
}

/** Provedores disponíveis neste endereço. A Apple fica para quando houver conta de desenvolvedor. */
export function availableProviders(): OAuthProvider[] {
  return isLovableHost() ? ["google", "apple"] : ["google"];
}

export async function signInWithProvider(
  provider: OAuthProvider,
  redirectTo: string,
): Promise<{ error?: unknown; redirected?: boolean }> {
  if (isLovableHost()) {
    return lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectTo });
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return error ? { error } : { redirected: true };
}
