import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BR_UFS } from "@/constants/app";

/**
 * Municípios de uma UF pela API oficial do IBGE (lista completa, com acentos).
 * Fica em memória no servidor por 7 dias: a lista quase nunca muda.
 * Se o IBGE estiver fora, devolve [] e o campo usa as cidades da pesquisa da ANP.
 */
const cache = new Map<string, { at: number; names: string[] }>();
const WEEK = 7 * 24 * 60 * 60_000;

export const listMunicipios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uf: string }) => {
    const uf = String(input?.uf ?? "").toUpperCase();
    if (!(BR_UFS as readonly string[]).includes(uf)) throw new Error("UF inválida");
    return { uf };
  })
  .handler(async ({ data }) => {
    const hit = cache.get(data.uf);
    if (hit && Date.now() - hit.at < WEEK) return hit.names;
    try {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${data.uf}/municipios`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!res.ok) return [];
      const list = (await res.json()) as { nome?: string }[];
      const names = [...new Set(list.map((m) => m.nome).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      );
      if (names.length) cache.set(data.uf, { at: Date.now(), names });
      return names;
    } catch {
      return [];
    }
  });
