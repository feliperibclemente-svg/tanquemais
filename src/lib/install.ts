/**
 * Instalação do app na tela inicial (PWA).
 *
 * O Chrome/Android dispara `beforeinstallprompt` logo no carregamento, muitas vezes antes
 * da tela que mostra o botão existir; por isso o evento é guardado aqui, num módulo
 * carregado pela raiz. No iPhone não há esse evento: mostramos o passo a passo do Safari.
 */
import { track } from "./analytics";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    track("app_installed");
    notify();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Já está aberto como app instalado (sem barra do navegador)? */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Navegador embutido de outro app (Instagram, Facebook, TikTok, WebView do Android).
 * Ali não dá para instalar e o login pode não ficar salvo: melhor abrir no navegador.
 */
export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\/|; wv\)/i.test(navigator.userAgent);
}

export function canPromptInstall() {
  return deferred !== null;
}

/** Abre o diálogo nativo de instalação (Android/Chrome). */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const choice = await event.userChoice;
  notify();
  return choice.outcome === "accepted";
}
