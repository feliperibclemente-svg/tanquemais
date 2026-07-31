/**
 * Analytics de produto do Tanque+.
 *
 * Eventos são tipados para evitar nomes soltos espalhados pelo código.
 * O envio é feito para o coletor disponível (Lovable/GA/PostHog quando presentes)
 * e sempre registrado como log estruturado.
 */
import { log } from "./telemetry";

export type AnalyticsEvent =
  | "auth_sign_in"
  | "auth_sign_up"
  | "auth_sign_out"
  | "vehicle_created"
  | "vehicle_updated"
  | "vehicle_deleted"
  | "fueling_created"
  | "fueling_queued_offline"
  | "fueling_synced"
  | "fueling_deleted"
  | "tanque_ia_requested"
  | "tanque_ia_answered";

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
