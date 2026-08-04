/**
 * Utilitários para os testes de permissão de leitura (GRANTs + RLS).
 *
 * Os testes falam HTTP direto com a Data API, exatamente como o app faz,
 * então validam a combinação real de GRANT de coluna + política de RLS.
 */

export const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
export const ANON_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";

export interface RestResult {
  status: number;
  body: unknown;
}

/** Executa uma leitura na Data API como anon ou como usuário logado (token). */
export async function restSelect(
  table: string,
  select: string,
  options: { token?: string | undefined; query?: string } = {},
): Promise<RestResult> {
  const query = options.query ? `&${options.query}` : "";
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${query}&limit=5`,
    {
      headers: {
        apikey: ANON_KEY,
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    },
  );
  return { status: res.status, body: await res.json().catch(() => null) };
}

export function isPermissionDenied(result: RestResult): boolean {
  const code = (result.body as { code?: string } | null)?.code;
  return result.status === 401 || result.status === 403 || code === "42501";
}

export function rows(result: RestResult): Record<string, unknown>[] {
  return Array.isArray(result.body) ? (result.body as Record<string, unknown>[]) : [];
}

/** Faz login com e-mail/senha e devolve o access token. */
export async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(`Login falhou para ${email}: ${data.error_description ?? res.status}`);
  }
  return data.access_token;
}

export function userIdFromToken(token: string): string {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"),
  ) as { sub: string };
  return payload.sub;
}

/**
 * Credenciais opcionais para os cenários autenticados.
 * Defina no ambiente para habilitar os testes de usuário logado:
 *   TANQUE_TEST_EMAIL_A / TANQUE_TEST_PASSWORD_A  (usuário A)
 *   TANQUE_TEST_EMAIL_B / TANQUE_TEST_PASSWORD_B  (usuário B, "o outro usuário")
 */
export const testUsers = {
  a: {
    email: process.env["TANQUE_TEST_EMAIL_A"] ?? "",
    password: process.env["TANQUE_TEST_PASSWORD_A"] ?? "",
  },
  b: {
    email: process.env["TANQUE_TEST_EMAIL_B"] ?? "",
    password: process.env["TANQUE_TEST_PASSWORD_B"] ?? "",
  },
};

export const hasUserA = Boolean(testUsers.a.email && testUsers.a.password);
export const hasUserB = Boolean(testUsers.b.email && testUsers.b.password);
