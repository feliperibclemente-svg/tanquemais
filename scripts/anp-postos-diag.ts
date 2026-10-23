// Diagnóstico (não vai para o main): lê o arquivo real da ANP por posto com o leitor do app.
import { readXlsx } from "../src/lib/xlsx-lite.server";
import { parseStationSheet } from "../src/services/anp-stations";

const url =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/revendas_lpc_2026_10_11-2026_10_17.xlsx";
const res = await fetch(url, { headers: { "User-Agent": "TanqueMais/1.0 (+https://www.tanquemais.com.br)" } });
console.log("HTTP", res.status, res.headers.get("content-type"));
const sheets = readXlsx(Buffer.from(await res.arrayBuffer()));
for (const [name, data] of Object.entries(sheets)) {
  console.log(`\nABA "${name}": ${data.length} linhas`);
  data.slice(0, 12).forEach((r, i) => console.log(i, JSON.stringify(r).slice(0, 400)));
  const parsed = parseStationSheet(data, { start: "2026-10-11", end: "2026-10-17" });
  console.log("linhas lidas pelo app:", parsed.rows.length, parsed.headers ? `cabeçalho não reconhecido: ${parsed.headers.join(" | ")}` : "");
  for (const city of ["GOIANIA", "APARECIDA DE GOIANIA"]) {
    for (const fuel of ["gasolina", "etanol"]) {
      const top = parsed.rows
        .filter((r) => r.uf === "GO" && r.municipio === city && r.fuel_type_id === fuel)
        .sort((a, b) => a.price - b.price);
      console.log(`\n${city} ${fuel}: ${top.length} postos`);
      top.slice(0, 5).forEach((r) => console.log(" ", r.price, "|", r.name, "|", r.address, "|", r.bairro, "|", r.brand, "|", r.collected_on));
    }
  }
}
