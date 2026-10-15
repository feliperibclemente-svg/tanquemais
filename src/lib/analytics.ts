/**
 * Analytics de produto do Tanque+.
 *
 * Eventos são tipados para evitar nomes soltos espalhados pelo código.
 * O envio é feito para o coletor disponível (Lovable/GA/PostHog quando presentes)
 * e sempre registrado como log estruturado.
 */
import { log } from "./telemetry";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------- envio em lote ao banco ------------------------- */

interface PendingEvent {
  name: string;
  props: Props;
  route: string | null;
  created_at: string;
}

const FLUSH_INTERVAL = 5_000;
const MAX_BATCH = 50;
let buffer: PendingEvent[] = [];
let timerStarted = false;
let sessionId: string | null = null;

function currentSession(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem("tanque:session") ?? crypto.randomUUID();
    sessionStorage.setItem("tanque:session", sessionId);
  } catch {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

/** Nunca envia dados que identifiquem a pessoa. */
const PII = /mail|name|nome|phone|telefone|cpf|address|endereco|plate|placa/i;
function sanitize(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII.test(k)) continue;
    if (typeof v === "string" && /@/.test(v)) continue;
    out[k] = typeof v === "string" ? v.slice(0, 200) : v;
  }
  return out;
}

async function flushEvents() {
  if (buffer.length === 0) return;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      buffer = [];
      return;
    }
    const batch = buffer.splice(0, MAX_BATCH);
    const session = currentSession();
    await supabase.from("events").insert(
      batch.map((e) => ({
        user_id: userId,
        session_id: session,
        name: e.name,
        props: e.props,
        route: e.route,
        created_at: e.created_at,
      })),
    );
  } catch {
    /* analytics nunca quebra o app */
  }
}

function enqueue(name: string, props: Props) {
  if (typeof window === "undefined") return;
  try {
    buffer.push({
      name,
      props: sanitize(props),
      route: window.location.pathname,
      created_at: new Date().toISOString(),
    });
    if (buffer.length > 500) buffer = buffer.slice(-500);
    if (!timerStarted) {
      timerStarted = true;
      window.setInterval(() => void flushEvents(), FLUSH_INTERVAL);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void flushEvents();
      });
    }
  } catch {
    /* noop */
  }
}

export type AnalyticsEvent =
  /* funil de ativação */
  | "app_installed"
  | "app_opened"
  | "auth_screen_viewed"
  | "auth_sign_in"
  | "auth_sign_up"
  | "auth_sign_out"
  | "funnel_signup_completed"
  | "funnel_vehicle_added"
  | "funnel_first_fueling"
  | "funnel_activated"
  | "onboarding_started"
  | "onboarding_vehicle_saved"
  | "retention_day_return"
  /* uso */
  | "profile_updated"
  | "vehicle_created"
  | "vehicle_updated"
  | "vehicle_deleted"
  | "vehicle_set_primary"
  | "fueling_created"
  | "fueling_queued_offline"
  | "fueling_synced"
  | "fueling_deleted"
  | "export_csv"
  | "fueling_updated"
  | "tanque_ia_requested"
  | "tanque_ia_answered"
  /* beta */
  | "beta_notice_viewed"
  | "feedback_opened"
  | "feedback_submitted"
  | "app_error";

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    posthog?: { capture?: (event: string, props?: Props) => void };
  }
}

/** Registra um evento de produto. Nunca lança. */
export function track(event: AnalyticsEvent, props: Props = {}) {
  log("info", `analytics.${event}`, props);
  if (typeof window === "undefined") return;
  enqueue(event, props);
  try {
    window.gtag?.("event", event, props);
    window.posthog?.capture?.(event, props);
  } catch {
    /* analytics nunca quebra o app */
  }
}

const ONCE_KEY = "tanque:analytics:milestones";

function milestones(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ONCE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Dispara um evento de funil apenas uma vez por usuário neste aparelho.
 * Serve só para não duplicar métricas — o dado de verdade vive no banco.
 */
export function trackOnce(event: AnalyticsEvent, userId: string, props: Props = {}) {
  if (typeof window === "undefined") return;
  const key = `${event}:${userId}`;
  const done = milestones();
  if (done[key]) return;
  track(event, props);
  try {
    localStorage.setItem(ONCE_KEY, JSON.stringify({ ...done, [key]: new Date().toISOString() }));
  } catch {
    /* noop */
  }
}

/** Marca visita diária para medir retenção (D1, D7, D30). */
export function trackRetention(userId: string) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const done = milestones();
  const firstKey = `first_seen:${userId}`;
  const lastKey = `last_seen:${userId}`;
  const first = done[firstKey] ?? today;
  if (done[lastKey] === today) return;

  const days = Math.round((new Date(today).getTime() - new Date(first).getTime()) / 86_400_000);
  if (days > 0) track("retention_day_return", { day: days });
  try {
    localStorage.setItem(
      ONCE_KEY,
      JSON.stringify({ ...done, [firstKey]: first, [lastKey]: today }),
    );
  } catch {
    /* noop */
  }
}

/** Page view em navegações client-side. */
export function trackPageView(path: string) {
  log("debug", "analytics.page_view", { path });
  if (typeof window === "undefined") return;
  enqueue("page_view", { path });
  try {
    window.gtag?.("event", "page_view", { page_path: path });
    window.posthog?.capture?.("$pageview", { path });
  } catch {
    /* noop */
  }
}
