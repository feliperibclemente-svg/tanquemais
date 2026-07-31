/**
 * Telemetria do Tanque+: logs estruturados, captura de erros (crash reporting)
 * e monitoramento de performance.
 *
 * Tudo roda apenas no browser e nunca lança — telemetria jamais pode derrubar
 * a aplicação. Em desenvolvimento os eventos aparecem no console; em produção
 * são enviados ao coletor do Lovable quando disponível.
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
    // eslint-disable-next-line no-console
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
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (error instanceof Response) return { name: "Response", message: `HTTP ${error.status}` };
  return { name: "Unknown", message: String(error) };
}

/** Captura de exceção (crash reporting). */
export function captureException(error: unknown, context: Record<string, unknown> = {}) {
  const described = describe(error);
  log("error", described.message || "Erro desconhecido", {
    ...context,
    errorName: described.name,
    stack: described.stack,
  });

  if (typeof window === "undefined") return;
  try {
    window.__lovableEvents?.captureException?.(
      error,
      { ...context, route: route(), sessionId, userId, breadcrumbs: recentLogs().slice(-10) },
      { mechanism: "manual", handled: true, severity: "error" },
    );
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

  window.addEventListener("error", (event) =>
    captureException(event.error ?? event.message, { mechanism: "onerror" }),
  );
  window.addEventListener("unhandledrejection", (event) =>
    captureException(event.reason, { mechanism: "unhandledrejection" }),
  );

  observeWebVitals();
  log("info", "app.boot", { userAgent: navigator.userAgent, online: navigator.onLine });
}
