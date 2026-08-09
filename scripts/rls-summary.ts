/**
 * Resume os relatórios JUnit de RLS em Markdown.
 *
 * Uso: bun scripts/rls-summary.ts <pasta-de-relatorios> [--title "..."]
 * Escreve o Markdown no stdout.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "reports";
const titleIndex = process.argv.indexOf("--title");
const title = titleIndex > -1 ? (process.argv[titleIndex + 1] ?? "Testes de RLS") : "Testes de RLS";

interface SuiteSummary {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  attempt: number;
  failedNames: string[];
}

function collect(path: string): string[] {
  try {
    return readdirSync(path)
      .flatMap((entry) => {
        const full = join(path, entry);
        return statSync(full).isDirectory() ? collect(full) : [full];
      })
      .filter((file) => file.endsWith(".xml"));
  } catch {
    return [];
  }
}

function attr(xml: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(xml)?.[1] ?? "";
}

function num(xml: string, name: string): number {
  return Number(attr(xml, name) || 0);
}

const files = collect(dir);
const suites: SuiteSummary[] = files.map((file) => {
  const xml = readFileSync(file, "utf8");
  const header = /<testsuites[^>]*>/.exec(xml)?.[0] ?? xml.slice(0, 500);
  const base = file.split("/").pop()!.replace(/^junit-/, "").replace(/\.xml$/, "");
  const attemptMatch = /-attempt(\d+)$/.exec(base);
  const failedNames = [...xml.matchAll(/<testcase[^>]*name="([^"]*)"[^>]*>\s*<failure/g)].map(
    (m) => m[1]!,
  );
  return {
    name: base.replace(/-attempt\d+$/, ""),
    tests: num(header, "tests"),
    failures: num(header, "failures"),
    errors: num(header, "errors"),
    skipped: num(header, "skipped"),
    time: num(header, "time"),
    attempt: attemptMatch ? Number(attemptMatch[1]) : 1,
    failedNames,
  };
});

const lines: string[] = [`### ${title}`, ""];

if (suites.length === 0) {
  lines.push("Nenhum relatório JUnit encontrado.");
} else {
  lines.push("| Suíte | Tentativa | Testes | Falhas | Pulados | Duração | Status |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const s of suites.sort((a, b) => a.name.localeCompare(b.name) || a.attempt - b.attempt)) {
    const bad = s.failures + s.errors;
    lines.push(
      `| \`${s.name}\` | ${s.attempt} | ${s.tests} | ${bad} | ${s.skipped} | ${s.time.toFixed(1)}s | ${
        bad === 0 ? "✅ passou" : "❌ falhou"
      } |`,
    );
  }

  // ---- Indicador de flakiness (por suíte, comparando as tentativas) ----
  const byName = new Map<string, SuiteSummary[]>();
  for (const s of suites) {
    const list = byName.get(s.name) ?? [];
    list.push(s);
    byName.set(s.name, list);
  }

  const flakyLines: string[] = [];
  for (const [name, attemptsRaw] of byName) {
    const attempts = attemptsRaw.sort((a, b) => a.attempt - b.attempt);
    if (attempts.length < 2) continue;

    const bad = (s: SuiteSummary) => s.failures + s.errors;
    const first = attempts[0]!;
    const last = attempts[attempts.length - 1]!;

    let pattern: string;
    if (bad(first) > 0 && bad(last) === 0) pattern = "🟡 intermitente (falhou e passou ao repetir)";
    else if (bad(first) > 0 && bad(last) > 0) {
      const firstSet = new Set(first.failedNames);
      const sameTests =
        last.failedNames.length === firstSet.size && last.failedNames.every((n) => firstSet.has(n));
      pattern = sameTests
        ? "🔴 falha consistente (mesmos testes nas duas tentativas)"
        : "🟠 falha instável (testes diferentes a cada tentativa)";
    } else pattern = "🟢 passou em todas as tentativas";

    const durations = attempts.map((a) => `#${a.attempt}: ${a.time.toFixed(1)}s`).join(" · ");
    const results = attempts
      .map((a) => `#${a.attempt} ${bad(a) === 0 ? "✅" : `❌ (${bad(a)})`}`)
      .join(" → ");
    const drift =
      attempts.length >= 2 && first.time > 0
        ? ` (Δ ${(((last.time - first.time) / first.time) * 100).toFixed(0)}%)`
        : "";

    flakyLines.push(
      `| \`${name}\` | ${attempts.length} | ${results} | ${pattern} | ${durations}${drift} |`,
    );
  }

  if (flakyLines.length > 0) {
    lines.push(
      "",
      "#### Indicador de flakiness",
      "",
      "| Suíte | Tentativas | Resultado por tentativa | Padrão | Duração por tentativa |",
      "| --- | --- | --- | --- | --- |",
      ...flakyLines,
      "",
      "> ⚠️ Houve reexecução (retry) — veja o padrão acima para distinguir regressão real de teste intermitente.",
    );

    const intermittent = [...byName.values()].filter((a) => {
      if (a.length < 2) return false;
      const sorted = a.sort((x, y) => x.attempt - y.attempt);
      return (
        sorted[0]!.failures + sorted[0]!.errors > 0 &&
        sorted[sorted.length - 1]!.failures + sorted[sorted.length - 1]!.errors === 0
      );
    });
    if (intermittent.length > 0) {
      lines.push(
        "",
        `**Flaky detectado:** ${intermittent.length} suíte(s) passaram apenas na reexecução — investigue latência da Data API ou dados de teste compartilhados.`,
      );
    }
  }

  const failed = suites.flatMap((s) =>
    s.failedNames.map((n) => `\`${s.name}\` (tentativa ${s.attempt}) — ${n}`),
  );
  if (failed.length > 0) {
    lines.push("", "**Testes que falharam**", ...failed.slice(0, 20).map((f) => `- ${f}`));
    if (failed.length > 20) lines.push(`- … e mais ${failed.length - 20}`);
  }
}

const runUrl = process.env["RUN_URL"];
if (runUrl) {
  lines.push("", `[Ver execução e baixar artefatos JUnit](${runUrl}#artifacts)`);
}

console.log(lines.join("\n"));
