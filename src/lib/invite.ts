import { SITE_URL } from "@/constants/app";
import { track } from "@/lib/analytics";

/**
 * Mensagem do convite: natural entre amigos, com o benefício, "grátis" e "beta".
 * "iPhone e Android" sem citar lojas: o app abre pelo navegador e pode ir para a tela inicial.
 */
export function inviteMessage(): string {
  return `Estou usando o Tanque+ para ver o consumo real do meu carro e quanto gasto de combustível. É grátis e está em versão beta, funciona no iPhone e no Android: ${SITE_URL.replace(/^https?:\/\//, "")}`;
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
