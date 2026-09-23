/**
 * Analytics de produto do Tanque+.
 *
 * Eventos são tipados para evitar nomes soltos espalhados pelo código.
 * O envio é feito para o coletor disponível (Lovable/GA/PostHog quando presentes)
 * e sempre registrado como log estruturado.
 */
import { log } from "./telemetry";

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
  | "retention_day_return"
  /* uso */
  | "vehicle_created"
  | "vehicle_updated"
  | "vehicle_deleted"
  | "fueling_created"
  | "fueling_queued_offline"
  | "fueling_synced"
  | "fueling_deleted"
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
  try {
    window.gtag?.("event", "page_view", { page_path: path });
    window.posthog?.capture?.("$pageview", { path });
  } catch {
    /* noop */
  }
}
