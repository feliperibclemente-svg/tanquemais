import { UserPlus } from "lucide-react";
import { Action } from "@/components/ds/action";
import { inviteFriends } from "@/lib/invite";

/** Botão "Convidar amigos" (mensagem pronta para WhatsApp e outros apps). */
export function InviteButton({
  source,
  variant = "secondary",
  label = "Convidar amigos",
}: {
  source: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  return (
    <Action
      variant={variant}
      size="md"
      className="w-full"
      onClick={() => void inviteFriends(source)}
    >
      <UserPlus className="h-4 w-4" /> {label}
    </Action>
  );
}
