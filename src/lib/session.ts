import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * O login fica guardado no aparelho (localStorage) e é renovado sozinho pelo Supabase, então
 * a pessoa não precisa entrar de novo a cada visita. Sem internet (comum no posto), a
 * renovação falha temporariamente: nesse caso usamos a sessão guardada em vez de mandar
 * para a tela de login. O acesso aos dados continua protegido no servidor (RLS).
 */
export function storedSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as Session | null;
      if (parsed?.user?.id && parsed.refresh_token) return parsed;
    }
  } catch {
    /* armazenamento indisponível */
  }
  return null;
}

export async function currentSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (data.session) return data.session;
    if (error && isAuthRetryableFetchError(error)) return storedSession();
    return null;
  } catch (error) {
    return isAuthRetryableFetchError(error) || error instanceof TypeError ? storedSession() : null;
  }
}
