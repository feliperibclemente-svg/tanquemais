import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Action } from "@/components/ds/action";
import { AppCard } from "@/components/app/Surface";
import {
  canPromptInstall,
  isIos,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/install";

const DISMISS_KEY = "tanque:install-dismissed";

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Convite para instalar o Tanque+ na tela inicial. No Android usa o diálogo nativo;
 * no iPhone mostra o passo a passo do Safari. Some se o app já estiver instalado ou
 * se a pessoa fechar o cartão.
 */
export function InstallCard() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const update = () => {
      const iosDevice = isIos();
      setIos(iosDevice);
      setVisible(!isStandalone() && !wasDismissed() && (canPromptInstall() || iosDevice));
    };
    update();
    return subscribeInstall(update);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sem armazenamento: só esconde nesta visita */
    }
    setVisible(false);
  }

  return (
    <AppCard className="relative p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Tenha o Tanque+ na tela inicial</p>
          {ios ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No Safari, toque em{" "}
              <Share className="inline h-4 w-4 align-text-bottom" aria-label="Compartilhar" /> e
              depois em{" "}
              <span className="font-semibold text-foreground">Adicionar à Tela de Início</span>. Ele
              abre como app, direto na hora de abastecer.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Abre como app, sem procurar o link, direto na hora de abastecer.
            </p>
          )}
        </div>
      </div>
      {!ios ? (
        <Action
          size="md"
          className="mt-3"
          onClick={async () => {
            const accepted = await promptInstall();
            if (accepted) setVisible(false);
          }}
        >
          Instalar o app
        </Action>
      ) : null}
    </AppCard>
  );
}
