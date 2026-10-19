/**
 * Telemetria do Tanque+: logs estruturados, captura de erros (crash reporting)
 * e monitoramento de performance.
 *
 * Tudo roda apenas no browser e nunca lança — telemetria jamais pode derrubar
 * a aplicação. Em desenvolvimento os eventos aparecem no console; em produção
 * os erros vão para a tabela app_errors (sem nome nem e-mail), vista no painel admin.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
  time: string;
  route: string;
  sessionId: string;
}

const MAX_BUFFER = 100;
const buffer: LogRecord[] = [];

let userId: string | null = null;
let installed = false;

const sessionId = (() => {
  try {
    if (typeof window === "undefined") return "ssr";
    const key = "tanque:session-id";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return "anon";
  }
})();

function route(): string {
  return typeof window === "undefined" ? "ssr" : window.location.pathname;
}

function isDev(): boolean {
  return import.meta.env.DEV;
}

/** Identifica o usuário atual nos logs (sem PII além do id). */
export function setTelemetryUser(id: string | null) {
  userId = id;
}

/** Log estruturado. Sempre inclui rota, sessão e usuário. */
export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  const record: LogRecord = {
    level,
    message,
    context: { ...context, userId },
    time: new Date().toISOString(),
    route: route(),
    sessionId,
  };

  buffer.push(record);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  if (isDev()) {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[tanque:${level}] ${message}`, record.context);
    return;
  }

  if (level === "error" || level === "warn") {
    console.log(JSON.stringify(record));
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};

/** Últimos logs em memória — útil para anexar contexto a um crash. */
export function recentLogs(): LogRecord[] {
  return [...buffer];
}

function describe(error: unknown) {
  if (error instanceof Error)
    return { name: error.name, message: error.message, stack: error.stack };
  if (error instanceof Response) return { name: "Response", message: `HTTP ${error.status}` };
  return { name: "Unknown", message: String(error) };
}

/** Captura de exceção (crash reporting). */
/**
 * Depois de uma atualização, uma aba aberta antes dela pode pedir um pedaço de código que
 * não existe mais no servidor. Não é defeito do app: basta recarregar para pegar a versão nova.
 */
export function isStaleBuildError(message: string | undefined | null): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading (CSS )?chunk .* failed/i.test(
    message ?? "",
  );
}

/** Avisos do React de que houve um problema, mas ele se recuperou sozinho (tela funcionou). */
export function isReactRecoverable(message: string | undefined | null): boolean {
  return /Minified React error #(418|419|421|422|423|425|520)\b/.test(message ?? "");
}

const RELOAD_KEY = "tanque:reload-new-version";

/** Recarrega uma vez para buscar a versão nova; nunca entra em ciclo (1x a cada 30 s). */
export function reloadForNewVersion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export function captureException(error: unknown, context: Record<string, unknown> = {}) {
  const described = describe(error);
  if (isStaleBuildError(described.message)) {
    // Registra (para sabermos que acontece) e recarrega com a versão nova.
    if (typeof window !== "undefined" && !isDev()) {
      void reportError(described, "versao-antiga");
    }
    reloadForNewVersion();
    return;
  }
  log("error", described.message || "Erro desconhecido", {
    ...context,
    errorName: described.name,
    stack: described.stack,
  });

  if (typeof window === "undefined" || isDev()) return;
  const mechanism = isReactRecoverable(described.message)
    ? "react-recuperado"
    : String(context.mechanism ?? context.scope ?? "manual");
  void reportError(described, mechanism);
}

/** Tira do texto o que poderia identificar alguém ou dar acesso (e-mails, tokens). */
export function scrub(text: string | undefined, max: number): string | null {
  if (!text) return null;
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(access_token|refresh_token|token|code|apikey|key)=([^&\s"']+)/gi, "$1=[oculto]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[jwt]")
    .slice(0, max);
}

const MAX_REPORTS_PER_SESSION = 10;
const reported = new Set<string>();

/** Grava o erro em app_errors: no máximo 10 por sessão, sem repetir o mesmo erro na mesma tela. */
async function reportError(described: ReturnType<typeof describe>, mechanism: string) {
  try {
    const message = scrub(described.message || "Erro desconhecido", 500) ?? "Erro desconhecido";
    const key = `${message}|${route()}`;
    if (reported.has(key) || reported.size >= MAX_REPORTS_PER_SESSION) return;
    reported.add(key);
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("app_errors").insert({
      name: scrub(described.name, 100),
      message,
      stack: scrub(described.stack, 4000),
      route: route().slice(0, 200),
      mechanism: mechanism.slice(0, 50),
      user_agent: navigator.userAgent.slice(0, 300),
    });
  } catch {
    /* telemetria nunca quebra o app */
  }
}

/** Mede a duração de uma operação e registra como métrica. */
export async function measure<T>(name: string, run: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    const result = await run();
    log("debug", "perf.span", { name, durationMs: Math.round(performance.now() - started) });
    return result;
  } catch (error) {
    log("warn", "perf.span.failed", {
      name,
      durationMs: Math.round(performance.now() - started),
    });
    throw error;
  }
}

function observeWebVitals() {
  if (typeof PerformanceObserver === "undefined") return;

  const safeObserve = (type: string, handler: (entry: PerformanceEntry) => void) => {
    try {
      const observer = new PerformanceObserver((list) => list.getEntries().forEach(handler));
      observer.observe({ type, buffered: true } as PerformanceObserverInit);
    } catch {
      /* tipo não suportado neste navegador */
    }
  };

  safeObserve("largest-contentful-paint", (entry) =>
    log("info", "perf.lcp", { valueMs: Math.round(entry.startTime) }),
  );

  safeObserve("first-input", (entry) => {
    const e = entry as PerformanceEventTiming;
    log("info", "perf.inp", { valueMs: Math.round(e.processingStart - e.startTime) });
  });

  let cls = 0;
  safeObserve("layout-shift", (entry) => {
    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!shift.hadRecentInput) cls += shift.value;
  });

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && cls > 0) {
      log("info", "perf.cls", { value: Number(cls.toFixed(3)) });
      cls = 0;
    }
  });
}

/** Instala handlers globais de erro e o monitoramento de performance. */
export function installTelemetry() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Vite avisa quando um pedaço de código não carrega (aba aberta antes de uma atualização).
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    captureException(
      (event as Event & { payload?: unknown }).payload ??
        new Error("Failed to fetch dynamically imported module (preload)"),
      {
        mechanism: "preload",
      },
    );
  });

  window.addEventListener("error", (event) =>
    captureException(event.error ?? event.message, { mechanism: "onerror" }),
  );
  window.addEventListener("unhandledrejection", (event) =>
    captureException(event.reason, { mechanism: "unhandledrejection" }),
  );

  observeWebVitals();
  log("info", "app.boot", { userAgent: navigator.userAgent, online: navigator.onLine });
}
