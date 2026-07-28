import type { PostgrestError } from "@supabase/supabase-js";

/** Erro de domínio com mensagem amigável em português. */
export class RepositoryError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
  }
}

const FRIENDLY: Record<string, string> = {
  "23505": "Esse registro já existe.",
  "23503": "Registro relacionado não encontrado.",
  "42501": "Você não tem permissão para essa ação.",
  PGRST116: "Registro não encontrado.",
};

export function toFriendly(error: PostgrestError): RepositoryError {
  const message =
    FRIENDLY[error.code] ??
    (error.message.includes("Failed to fetch")
      ? "Sem conexão. Tente novamente."
      : "Não foi possível concluir. Tente novamente.");
  return new RepositoryError(message, error.code);
}

/** Desembrulha uma resposta do Supabase, lançando erro tratado. */
export function unwrap<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw toFriendly(res.error);
  return res.data as T;
}

export function unwrapMaybe<T>(res: { data: T | null; error: PostgrestError | null }): T | null {
  if (res.error) throw toFriendly(res.error);
  return res.data;
}
