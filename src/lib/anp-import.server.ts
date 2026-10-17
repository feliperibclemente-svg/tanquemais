import {
  ANP_PAGE_URL,
  normalizeName,
  parseReferenceSheet,
  weekFromFileName,
  type PriceReferenceRow,
} from "@/services/anp";
import { readXlsx } from "@/lib/xlsx-lite.server";

/**
 * Importa o resumo semanal da ANP (médias por município e por estado) para a tabela
 * fuel_price_references. Roda uma vez por dia (Vercel Cron) e só grava quando há semana nova.
 */

const BASE =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc";
const HEADERS = { "User-Agent": "TanqueMais/1.0 (+https://www.tanquemais.com.br)" };

export type AnpImportResult =
  | { status: "imported"; week: string; municipios: number; estados: number }
  | { status: "up_to_date"; week: string }
  | { status: "not_found"; tried: string[] }
  | { status: "error"; week?: string; message: string };

type WeekFile = { url: string; start: string; end: string };

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Últimas semanas (domingo a sábado) já encerradas, da mais recente para a mais antiga. */
function recentWeeks(now: Date, count: number): { start: string; end: string }[] {
  const lastSaturday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  lastSaturday.setUTCDate(lastSaturday.getUTCDate() - ((lastSaturday.getUTCDay() + 1) % 7));
  return Array.from({ length: count }, (_, i) => {
    const end = new Date(lastSaturday.getTime() - i * 7 * 86_400_000);
    const start = new Date(end.getTime() - 6 * 86_400_000);
    return { start: iso(start), end: iso(end) };
  });
}

/** Lê a página da ANP; se falhar, monta os endereços pelo padrão de nome dos arquivos. */
async function candidateFiles(now: Date): Promise<WeekFile[]> {
  try {
    const res = await fetch(ANP_PAGE_URL, { headers: HEADERS });
    if (res.ok) {
      const html = await res.text();
      const found = new Map<string, WeekFile>();
      for (const m of html.matchAll(/href="([^"]*resumo_semanal_lpc_[\d-]+_[\d-]+\.xlsx)"/gi)) {
        const url = new URL(m[1], ANP_PAGE_URL).toString();
        const week = weekFromFileName(url);
        if (week) found.set(week.start, { url, ...week });
      }
      if (found.size) return [...found.values()].sort((a, b) => (a.start < b.start ? 1 : -1));
    }
  } catch {
    /* segue para o padrão de nomes */
  }
  return recentWeeks(now, 3).flatMap((w) =>
    [...new Set([w.start.slice(0, 4), w.end.slice(0, 4)])].map((year) => ({
      url: `${BASE}/${year}/resumo_semanal_lpc_${w.start}_${w.end}.xlsx`,
      ...w,
    })),
  );
}

export function rowsFromWorkbook(
  sheets: Record<string, unknown[][]>,
  week: { start: string; end: string },
): PriceReferenceRow[] {
  const rows: PriceReferenceRow[] = [];
  for (const [name, data] of Object.entries(sheets)) {
    const n = normalizeName(name);
    if (n.includes("MUNICIP")) rows.push(...parseReferenceSheet(data, "municipio", week));
    else if (n.includes("ESTADO")) rows.push(...parseReferenceSheet(data, "estado", week));
  }
  const unique = new Map<string, PriceReferenceRow>();
  for (const r of rows) unique.set(`${r.scope}|${r.uf}|${r.municipio}|${r.fuel_type_id}`, r);
  return [...unique.values()];
}

export async function importAnpWeek(
  options: { force?: boolean; now?: Date } = {},
): Promise<AnpImportResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const files = await candidateFiles(options.now ?? new Date());
  const tried: string[] = [];

  for (const file of files.slice(0, 4)) {
    const { count } = await supabaseAdmin
      .from("fuel_price_references")
      .select("id", { count: "exact", head: true })
      .eq("source", "ANP")
      .eq("week_start", file.start);
    if ((count ?? 0) > 0 && !options.force) return { status: "up_to_date", week: file.start };

    tried.push(file.url);
    const res = await fetch(file.url, { headers: HEADERS });
    if (!res.ok) continue;

    let rows: PriceReferenceRow[];
    try {
      const sheets = readXlsx(Buffer.from(await res.arrayBuffer()));
      rows = rowsFromWorkbook(sheets, file);
      const municipios = rows.filter((r) => r.scope === "municipio").length;
      if (municipios < 50) {
        return {
          status: "error",
          week: file.start,
          message: `Formato inesperado: ${municipios} linhas de municípios (abas: ${Object.keys(sheets).join(", ")})`,
        };
      }
    } catch (error) {
      return { status: "error", week: file.start, message: (error as Error).message };
    }

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from("fuel_price_references").upsert(
        rows.slice(i, i + 500).map((r) => ({ ...r, source: "ANP" })),
        { onConflict: "source,week_start,scope,uf,municipio,fuel_type_id" },
      );
      if (error) return { status: "error", week: file.start, message: error.message };
    }
    return {
      status: "imported",
      week: file.start,
      municipios: rows.filter((r) => r.scope === "municipio").length,
      estados: rows.filter((r) => r.scope === "estado").length,
    };
  }
  return { status: "not_found", tried };
}
