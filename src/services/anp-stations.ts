import { normalizeName, toFuelTypeId, toNumber, toUf } from "@/services/anp";

/* =========================================================================
 * Preços por posto da pesquisa semanal da ANP ("Preços por posto revendedor").
 * O leitor acha as colunas pelo nome do cabeçalho; se não achar as essenciais, devolve
 * os cabeçalhos vistos para o painel admin mostrar (nada é gravado errado).
 * Testado em tests/unit/anp-stations.test.ts.
 * ========================================================================= */

export interface StationPriceRow {
  week_start: string;
  week_end: string;
  uf: string;
  municipio: string; // normalizado, como em fuel_price_references
  cnpj: string;
  name: string;
  address: string | null;
  bairro: string | null;
  brand: string | null;
  fuel_type_id: string;
  price: number;
  collected_on: string | null;
}

type Col =
  | "cnpj"
  | "fantasia"
  | "razao"
  | "rua"
  | "numero"
  | "bairro"
  | "municipio"
  | "uf"
  | "bandeira"
  | "produto"
  | "preco"
  | "data";

const REQUIRED: Col[] = ["cnpj", "municipio", "uf", "produto", "preco"];

function columnOf(cell: string): Col | null {
  if (cell.includes("CNPJ")) return "cnpj";
  if (cell.includes("FANTASIA")) return "fantasia";
  if (cell.startsWith("RAZAO") || cell === "REVENDA") return "razao";
  if (cell.startsWith("ENDERECO") || cell === "NOME DA RUA" || cell === "LOGRADOURO") return "rua";
  if (cell.startsWith("NUMERO") && !cell.includes("POSTO")) return "numero";
  if (cell === "BAIRRO") return "bairro";
  if (cell === "MUNICIPIO") return "municipio";
  if (cell === "UF" || cell === "ESTADO" || cell === "ESTADO SIGLA") return "uf";
  if (cell === "BANDEIRA") return "bandeira";
  if (cell === "PRODUTO") return "produto";
  if (cell.startsWith("PRECO") || cell === "VALOR DE VENDA") return "preco";
  if (cell.startsWith("DATA")) return "data";
  return null;
}

const LOWER = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
const title = (v: string) =>
  v
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && LOWER.has(w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");

/** Data da coleta: número de série do Excel ou "dd/mm/aaaa". */
function toIsoDate(value: unknown): string | null {
  if (typeof value === "number" && value > 20000 && value < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 10);
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(value ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const text = (row: unknown[], i: number | undefined) =>
  i === undefined ? "" : String(row[i] ?? "").trim();

export function parseStationSheet(
  rows: unknown[][],
  week: { start: string; end: string },
): { rows: StationPriceRow[]; headers: string[] | null } {
  for (let h = 0; h < Math.min(rows.length, 40); h += 1) {
    const cols: Partial<Record<Col, number>> = {};
    rows[h].forEach((c, j) => {
      const col = columnOf(normalizeName(String(c ?? "")));
      if (col && cols[col] === undefined) cols[col] = j;
    });
    if (!REQUIRED.every((c) => cols[c] !== undefined)) continue;

    const out = new Map<string, StationPriceRow>();
    for (const row of rows.slice(h + 1)) {
      const fuel = toFuelTypeId(text(row, cols.produto));
      const uf = toUf(text(row, cols.uf));
      const price = toNumber(row[cols.preco!]);
      const cnpj = text(row, cols.cnpj).replace(/\D/g, "").padStart(14, "0"); // a planilha guarda como número
      const municipio = normalizeName(text(row, cols.municipio));
      if (!fuel || !uf || !cnpj || !municipio || price === null || price < 0.5 || price > 30) {
        continue;
      }
      const name = text(row, cols.fantasia) || text(row, cols.razao) || "Posto";
      const street = [text(row, cols.rua), text(row, cols.numero)].filter(Boolean).join(", ");
      const brand = text(row, cols.bandeira);
      // Um preço por posto e combustível (o menor, se a planilha repetir).
      const key = `${cnpj}|${fuel}`;
      const prev = out.get(key);
      if (prev && prev.price <= price) continue;
      out.set(key, {
        week_start: week.start,
        week_end: week.end,
        uf,
        municipio,
        cnpj,
        name: title(name),
        address: street ? title(street) : null,
        bairro: text(row, cols.bairro) ? title(text(row, cols.bairro)) : null,
        brand: brand ? title(brand) : null,
        fuel_type_id: fuel,
        price: Math.round(price * 1000) / 1000,
        collected_on: toIsoDate(cols.data !== undefined ? row[cols.data] : null),
      });
    }
    return { rows: [...out.values()], headers: null };
  }
  // Sem as colunas essenciais: devolve a 1ª linha preenchida para diagnóstico.
  const first = rows.find((r) => r.filter((c) => String(c ?? "").trim()).length >= 3) ?? [];
  return { rows: [], headers: first.map((c) => String(c ?? "").trim()).filter(Boolean) };
}

/** Nome do arquivo por posto a partir do arquivo de médias da mesma semana. */
export function stationFileUrl(summaryUrl: string): string {
  return summaryUrl.replace(/resumo_semanal_lpc_/i, "revendas_lpc_");
}
