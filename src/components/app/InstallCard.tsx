import { useEffect, useState, type ReactNode } from "react";
import { EllipsisVertical, Share, Smartphone, X } from "lucide-react";
import { Action } from "@/components/ds/action";
import { AppCard } from "@/components/app/Surface";
import {
  canPromptInstall,
  isInAppBrowser,
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
 * no iPhone mostra o passo a passo do Safari. No Início some se a pessoa fechar o cartão;
 * no Perfil (`persistent`) fica sempre disponível enquanto o app não estiver instalado,
 * com o passo a passo manual quando o navegador não oferece o diálogo.
 */
export function InstallCard({ persistent = false }: { persistent?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [env, setEnv] = useState({ ios: false, inApp: false, prompt: false });

  useEffect(() => {
    const update = () => {
      const next = { ios: isIos(), inApp: isInAppBrowser(), prompt: canPromptInstall() };
      setEnv(next);
      setVisible(
        !isStandalone() &&
          (persistent || (!wasDismissed() && (next.prompt || next.ios || next.inApp))),
      );
    };
    update();
    return subscribeInstall(update);
  }, [persistent]);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sem armazenamento: só esconde nesta visita */
    }
    setVisible(false);
  }

  const strong = (text: string) => <span className="font-semibold text-foreground">{text}</span>;

  let body: ReactNode;
  if (env.inApp) {
    body = (
      <>
        Você está no navegador de outro app. Para instalar e continuar conectado, toque no menu{" "}
        {strong("⋯")} e escolha {strong("Abrir no navegador")}.
      </>
    );
  } else if (env.ios) {
    body = (
      <>
        No Safari, toque em{" "}
        <Share className="inline h-4 w-4 align-text-bottom" aria-label="Compartilhar" /> e depois em{" "}
        {strong("Adicionar à Tela de Início")}. Ele abre como app e você continua conectado.
      </>
    );
  } else if (env.prompt) {
    body = <>Abre como app, sem procurar o link, e você continua conectado.</>;
  } else {
    body = (
      <>
        No Chrome, toque em{" "}
        <EllipsisVertical className="inline h-4 w-4 align-text-bottom" aria-label="menu" /> e depois
        em {strong("Instalar app")} ou {strong("Adicionar à tela inicial")}.
      </>
    );
  }

  return (
    <AppCard className="relative p-4">
      {persistent ? null : (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className={`flex items-start gap-3 ${persistent ? "" : "pr-8"}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Tenha o Tanque+ na tela inicial</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
      {env.prompt && !env.inApp ? (
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
