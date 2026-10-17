import { supabase } from "@/integrations/supabase/client";

export type OAuthProvider = "google" | "apple";

/** Provedores ativos no Supabase. A Apple entra quando houver conta de desenvolvedor Apple. */
export function availableProviders(): OAuthProvider[] {
  return ["google"];
}

export async function signInWithProvider(
  provider: OAuthProvider,
  redirectTo: string,
): Promise<{ error?: unknown; redirected?: boolean }> {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return error ? { error } : { redirected: true };
}
