import { inflateRawSync } from "node:zlib";

/**
 * Leitor mínimo de .xlsx (só no servidor), sem dependência externa: o arquivo é um zip com
 * XMLs; lemos os textos compartilhados e as células de cada aba. Suficiente para planilhas
 * de dados simples como as da ANP (sem fórmulas a recalcular).
 */

function readZip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  // Fim do diretório central: assinatura 0x06054b50, procurada de trás para frente.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Arquivo xlsx inválido (zip)");
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressedSize);
    files.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Devolve cada aba como matriz de valores (texto ou número). */
export function readXlsx(buffer: Buffer): Record<string, (string | number | null)[][]> {
  const files = readZip(buffer);
  const text = (name: string) => files.get(name)?.toString("utf8") ?? "";

  const shared: string[] = [];
  for (const si of text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
    shared.push(parts.join(""));
  }

  const rels = new Map<string, string>();
  for (const m of text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }

  const sheets: Record<string, (string | number | null)[][]> = {};
  for (const m of text("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(/name="([^"]+)"/.exec(m[0])?.[1] ?? "");
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] ?? "";
    const target = rels.get(rid);
    if (!target) continue;
    const xml = text(`xl/${target}`);
    const rows: (string | number | null)[][] = [];
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const values: (string | number | null)[] = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cell[1];
        const body = cell[2] ?? "";
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let value: string | number | null = null;
        if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? null;
        else if (type === "inlineStr")
          value = decodeXml(/<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] ?? "");
        else if (type === "str" && raw !== undefined) value = decodeXml(raw);
        else if (raw !== undefined)
          value = Number.isFinite(Number(raw)) ? Number(raw) : decodeXml(raw);
        const index = ref ? columnIndex(ref) : values.length;
        while (values.length < index) values.push(null);
        values[index] = value;
      }
      rows.push(values);
    }
    sheets[name] = rows;
  }
  return sheets;
}
