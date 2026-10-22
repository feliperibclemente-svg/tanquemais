/**
 * Preços de referência da ANP (Levantamento de Preços de Combustíveis, semanal).
 * Funções puras: leitura das linhas da planilha e escolha da referência para um abastecimento.
 * Fonte pública; o app só mostra médias, sempre com a fonte e a semana.
 */

export const ANP_SOURCE_LABEL = "ANP";
export const ANP_PAGE_URL =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas";

export type ReferenceScope = "municipio" | "estado";

export interface PriceReferenceRow {
  week_start: string; // YYYY-MM-DD (domingo)
  week_end: string; // YYYY-MM-DD (sábado)
  scope: ReferenceScope;
  uf: string;
  municipio: string; // normalizado ("" para estado)
  municipio_label: string | null;
  fuel_type_id: string;
  avg_price: number;
  min_price: number | null;
  max_price: number | null;
  stations: number | null;
}

/** Maiúsculas, sem acentos e espaços extras: "São José dos Campos " → "SAO JOSE DOS CAMPOS". */
export function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const UF_BY_NAME: Record<string, string> = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPA: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARA: "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPIRITO SANTO": "ES",
  GOIAS: "GO",
  MARANHAO: "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PARA: "PA",
  PARAIBA: "PB",
  PARANA: "PR",
  PERNAMBUCO: "PE",
  PIAUI: "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RONDONIA: "RO",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  "SAO PAULO": "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};
const UFS = new Set(Object.values(UF_BY_NAME));

export function toUf(value: string | null | undefined): string | null {
  const n = normalizeName(value);
  if (UFS.has(n)) return n;
  return UF_BY_NAME[n] ?? null;
}

/** Produto da ANP → combustível do app. Outros (S500, GLP) ficam de fora. */
export function toFuelTypeId(product: string | null | undefined): string | null {
  const p = normalizeName(product);
  if (p === "GASOLINA COMUM" || p === "GASOLINA") return "gasolina";
  if (p === "GASOLINA ADITIVADA") return "gasolina_aditivada";
  if (p === "ETANOL HIDRATADO" || p === "ETANOL") return "etanol";
  if (p.includes("DIESEL") && p.includes("S10")) return "diesel";
  if (p === "GNV") return "gnv";
  return null;
}

/** "6,15" | "6.15" | 6.15 → 6.15; inválido → null. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim().replace(/\s/g, "");
  if (!s || s === "-") return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

type Column = "estado" | "municipio" | "produto" | "postos" | "media" | "minimo" | "maximo";

function findHeader(
  rows: unknown[][],
): { index: number; cols: Partial<Record<Column, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    const cells = rows[i].map((c) => normalizeName(String(c ?? "")));
    const cols: Partial<Record<Column, number>> = {};
    cells.forEach((c, j) => {
      if (c === "ESTADO" || c === "ESTADOS" || c === "UF") cols.estado = j;
      else if (c === "MUNICIPIO") cols.municipio = j;
      else if (c === "PRODUTO") cols.produto = j;
      else if (c.startsWith("NUMERO DE POSTOS")) cols.postos = j;
      else if (c.startsWith("PRECO MEDIO REVENDA") || c === "PRECO MEDIO") cols.media ??= j;
      else if (c.startsWith("PRECO MINIMO REVENDA") || c === "PRECO MINIMO") cols.minimo ??= j;
      else if (c.startsWith("PRECO MAXIMO REVENDA") || c === "PRECO MAXIMO") cols.maximo ??= j;
    });
    if (cols.produto !== undefined && cols.media !== undefined && cols.estado !== undefined) {
      return { index: i, cols };
    }
  }
  return null;
}

/**
 * Converte as linhas de uma aba (municípios ou estados) em referências. Tolera variações:
 * procura o cabeçalho pelos nomes das colunas, ignora produtos fora do app e preços absurdos.
 */
export function parseReferenceSheet(
  rows: unknown[][],
  scope: ReferenceScope,
  week: { start: string; end: string },
): PriceReferenceRow[] {
  const header = findHeader(rows);
  if (!header) return [];
  const { cols } = header;
  if (scope === "municipio" && cols.municipio === undefined) return [];
  const out: PriceReferenceRow[] = [];
  for (const row of rows.slice(header.index + 1)) {
    const fuel = toFuelTypeId(String(row[cols.produto!] ?? ""));
    const uf = toUf(String(row[cols.estado!] ?? ""));
    const avg = toNumber(row[cols.media!]);
    if (!fuel || !uf || avg === null || avg < 0.5 || avg > 30) continue;
    const label = scope === "municipio" ? String(row[cols.municipio!] ?? "").trim() : "";
    if (scope === "municipio" && !label) continue;
    const stations = cols.postos !== undefined ? toNumber(row[cols.postos]) : null;
    out.push({
      week_start: week.start,
      week_end: week.end,
      scope,
      uf,
      municipio: scope === "municipio" ? normalizeName(label) : "",
      municipio_label: scope === "municipio" ? titleCase(label) : null,
      fuel_type_id: fuel,
      avg_price: Math.round(avg * 1000) / 1000,
      min_price: cols.minimo !== undefined ? toNumber(row[cols.minimo]) : null,
      max_price: cols.maximo !== undefined ? toNumber(row[cols.maximo]) : null,
      stations: stations !== null ? Math.round(stations) : null,
    });
  }
  return out;
}

const LOWER_WORDS = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && LOWER_WORDS.has(w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

/** Semana do arquivo "resumo_semanal_lpc_2026-10-04_2026-10-10.xlsx". */
export function weekFromFileName(name: string): { start: string; end: string } | null {
  // A ANP alterna o padrão: "2026-10-04_2026-10-10" ou "2026_10_11-2026_10_17".
  const d = "(\\d{4})[-_](\\d{2})[-_](\\d{2})";
  const m = new RegExp(`resumo_semanal_lpc_${d}[-_]${d}\\.xlsx`, "i").exec(name);
  return m ? { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` } : null;
}

/** Nome do combustível como a ANP pesquisa, para deixar claro o que está sendo comparado. */
export function referenceFuelName(fuelTypeId: string): {
  name: string;
  unit: string;
  article: "a" | "o";
} {
  switch (fuelTypeId) {
    case "gasolina":
      return { name: "gasolina comum", unit: "L", article: "a" };
    case "gasolina_aditivada":
      return { name: "gasolina aditivada", unit: "L", article: "a" };
    case "etanol":
      return { name: "etanol", unit: "L", article: "o" };
    case "diesel":
      return { name: "diesel S10", unit: "L", article: "o" };
    case "gnv":
      return { name: "GNV", unit: "m³", article: "o" };
    default:
      return { name: fuelTypeId, unit: "L", article: "o" };
  }
}

export interface ChosenReference {
  scope: ReferenceScope;
  /** Combustível da média (o mesmo do abastecimento comparado). */
  fuelTypeId: string;
  fuelName: string;
  unit: string;
  place: string; // "Campinas" ou "SP"
  avgPrice: number;
  weekStart: string;
  weekEnd: string;
  stations: number | null;
  /** Menor e maior preço encontrados pela ANP naquela semana (quando a planilha traz). */
  minPrice: number | null;
  maxPrice: number | null;
}

/** Referência mais antiga aceita: até 3 semanas antes do abastecimento. */
const MAX_AGE_DAYS = 21;

/**
 * Escolhe a média da ANP para comparar com um abastecimento: a semana mais recente que
 * começou até a data do abastecimento (no máximo 3 semanas antes), primeiro no município
 * da pessoa e, se a cidade não for pesquisada, no estado.
 */
export function chooseReference(
  refs: (Omit<
    Pick<
      PriceReferenceRow,
      | "scope"
      | "uf"
      | "municipio"
      | "municipio_label"
      | "fuel_type_id"
      | "avg_price"
      | "week_start"
      | "week_end"
      | "stations"
    >,
    "scope"
  > & {
    scope: string;
    min_price?: number | string | null;
    max_price?: number | string | null;
  })[],
  place: { uf: string | null | undefined; city: string | null | undefined },
  fuelTypeId: string | null | undefined,
  date: string | Date,
): ChosenReference | null {
  const uf = toUf(place.uf ?? "");
  if (!uf || !fuelTypeId) return null;
  const city = normalizeName(place.city);
  const day = new Date(date);
  const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const oldest = new Date(day.getTime() - MAX_AGE_DAYS * 86_400_000);
  const oldestKey = oldest.toISOString().slice(0, 10);
  const eligible = refs
    .filter(
      (r) =>
        r.uf === uf &&
        r.fuel_type_id === fuelTypeId &&
        r.week_start <= dayKey &&
        r.week_start >= oldestKey,
    )
    .sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
  const municipal = city
    ? eligible.find((r) => r.scope === "municipio" && r.municipio === city)
    : undefined;
  const chosen = municipal ?? eligible.find((r) => r.scope === "estado");
  if (!chosen) return null;
  return {
    scope: chosen.scope === "municipio" ? "municipio" : "estado",
    // A ANP escreve sem acento ("Sao Paulo"); mostramos a cidade como a pessoa digitou.
    place:
      chosen.scope === "municipio"
        ? titleCase((place.city ?? "").trim()) || (chosen.municipio_label ?? city)
        : uf,
    avgPrice: Number(chosen.avg_price),
    weekStart: chosen.week_start,
    weekEnd: chosen.week_end,
    fuelTypeId: chosen.fuel_type_id,
    fuelName: referenceFuelName(chosen.fuel_type_id).name,
    unit: referenceFuelName(chosen.fuel_type_id).unit,
    stations: chosen.stations ?? null,
    minPrice: chosen.min_price != null ? Number(chosen.min_price) : null,
    maxPrice: chosen.max_price != null ? Number(chosen.max_price) : null,
  };
}

/** "04/10 a 10/10" */
export function weekLabel(start: string, end: string): string {
  const f = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  return `${f(start)} a ${f(end)}`;
}

/* ---------------------------------------------------------------------------
 * Cidades com menor média (ANP). Compara cidades, nunca postos.
 * ------------------------------------------------------------------------- */

/** Mínimo de postos pesquisados para a média da cidade entrar na comparação. */
export const MIN_STATIONS_FOR_RANKING = 5;

export interface CityPrice {
  uf: string;
  municipio: string;
  label: string;
  avgPrice: number;
  stations: number | null;
}

export interface CityRanking {
  /** Cidades ordenadas da menor para a maior média (só as com postos suficientes). */
  cities: CityPrice[];
  /** Posição da cidade da pessoa (1 = menor média) ou null se ela não está na comparação. */
  position: number | null;
  mine: CityPrice | null;
  /** A cidade aparece na pesquisa, mas com poucos postos para comparar. */
  mineTooFewStations: boolean;
}

export function rankCities(
  rows: Pick<
    PriceReferenceRow,
    "uf" | "municipio" | "municipio_label" | "avg_price" | "stations"
  >[],
  myCity: { uf: string | null | undefined; city: string | null | undefined },
): CityRanking {
  const myUf = toUf(myCity.uf ?? "");
  const myName = normalizeName(myCity.city);
  const all = rows
    .filter((r) => r.municipio && Number(r.avg_price) > 0)
    .map((r) => ({
      uf: r.uf,
      municipio: r.municipio,
      label: r.municipio_label ?? titleCase(r.municipio),
      avgPrice: Number(r.avg_price),
      stations: r.stations ?? null,
    }));
  const cities = all
    .filter((c) => (c.stations ?? 0) >= MIN_STATIONS_FOR_RANKING)
    .sort((a, b) => a.avgPrice - b.avgPrice || a.label.localeCompare(b.label, "pt-BR"));
  const isMine = (c: CityPrice) => !!myName && c.municipio === myName && c.uf === myUf;
  const index = cities.findIndex(isMine);
  const mine = index >= 0 ? cities[index] : null;
  return {
    cities,
    position: index >= 0 ? index + 1 : null,
    mine: mine ? { ...mine, label: titleCase((myCity.city ?? "").trim()) || mine.label } : null,
    mineTooFewStations: index < 0 && all.some(isMine),
  };
}
