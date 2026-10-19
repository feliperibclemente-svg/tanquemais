import { SITE_URL } from "@/constants/app";
import { track } from "@/lib/analytics";

/** Mensagem do convite: curta, no tom de quem indica para um amigo. */
export function inviteMessage(): string {
  return `Tô usando o Tanque+ pra saber quanto meu carro gasta de verdade e se tô pagando caro no combustível. É grátis: ${SITE_URL.replace(/^https?:\/\//, "")}`;
}

/**
 * Convidar amigos: menu de compartilhar do celular (WhatsApp, Instagram...);
 * sem ele (computador), abre o WhatsApp com a mensagem pronta.
 */
export async function inviteFriends(source: string): Promise<void> {
  track("invite_opened", { source });
  const text = inviteMessage();
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      track("invite_shared", { source, via: "sheet" });
      return;
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  track("invite_shared", { source, via: "whatsapp" });
}
