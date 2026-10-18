import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Droplet, Fuel, Gauge, Lock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TeoAvatar } from "@/components/app/Teo";
import type { TeoMood } from "@/components/app/TeoArt";
import { cn } from "@/lib/utils";

/**
 * Apresentação do app no formato de stories: o Teo explica, em uma frase por tela, o que o
 * Tanque+ faz. Toque à direita avança, à esquerda volta, segurar pausa. Com "reduzir
 * movimento" ativo não há avanço automático. Guia de voz: docs/marca/teo.md.
 */

const STORY_MS = 7000;
export const TOUR_SEEN_KEY = "tanque:tour:v1";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    /* sem armazenamento: a apresentação pode aparecer de novo, sem problema */
  }
}

type Story = {
  title: string;
  teo: string;
  mood: TeoMood;
  visual: ReactNode;
};

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
      {children}
    </div>
  );
}

const STORIES: Story[] = [
  {
    title: "Quanto seu veículo gasta de verdade",
    mood: "cheer",
    teo: "Eu sou o Teo. Pego os abastecimentos que você registra e transformo em números claros: consumo, custo por km e gasto do mês.",
    visual: (
      <Panel>
        <div className="flex flex-wrap gap-2">
          <Chip>
            <Gauge className="h-4 w-4" /> km/L real
          </Chip>
          <Chip>R$ por km</Chip>
          <Chip>Gasto do mês</Chip>
        </div>
      </Panel>
    ),
  },
  {
    title: "Registre em uns 20 segundos",
    mood: "tip",
    teo: "No posto, com o veículo parado: quanto pagou, o preço do litro e o km do painel. Os valores mais comuns ficam a um toque.",
    visual: (
      <Panel>
        <p className="text-xs font-medium uppercase tracking-wide text-white/60">Valor pago</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[30, 50, 70, 100].map((v) => (
            <Chip key={v} className={v === 50 ? "border-[#1E9A66] bg-[#1E9A66]" : undefined}>
              R$ {v}
            </Chip>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm text-white">
          <span className="text-white/70">Km do painel</span>
          <span className="font-semibold tabular-nums">48.210 km</span>
        </div>
      </Panel>
    ),
  },
  {
    title: "Tanque cheio é o que dá a medida",
    mood: "tip",
    teo: "Quando você completa o tanque duas vezes seguidas, eu calculo quantos km por litro o veículo fez de verdade, e não o número do manual.",
    visual: (
      <Panel>
        <div className="flex items-center justify-between gap-2 text-white">
          <Chip>
            <Fuel className="h-4 w-4" /> Cheio
          </Chip>
          <span className="h-px flex-1 border-t border-dashed border-white/30" />
          <Chip>
            <Fuel className="h-4 w-4" /> Cheio
          </Chip>
        </div>
        <p className="mt-4 text-center text-3xl font-bold text-white tabular-nums">
          12,4 <span className="text-base font-semibold text-white/70">km/L</span>
        </p>
        <p className="text-center text-xs text-white/50">exemplo</p>
      </Panel>
    ),
  },
  {
    title: "Etanol ou gasolina? Preço em dia?",
    mood: "neutral",
    teo: "Digite os preços da bomba e eu digo qual compensa mais. E aviso quando o litro que você pagou ficou acima do que você costuma pagar.",
    visual: (
      <Panel>
        <div className="space-y-3">
          {[
            { label: "Etanol", width: "68%", tone: "bg-[#1E9A66]" },
            { label: "Gasolina", width: "100%", tone: "bg-white/40" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-sm text-white">
                <span className="inline-flex items-center gap-1.5">
                  <Droplet className="h-4 w-4" /> {row.label}
                </span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-white/10">
                <div className={cn("h-full rounded-full", row.tone)} style={{ width: row.width }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/50">exemplo: etanol a 68% do preço da gasolina</p>
      </Panel>
    ),
  },
  {
    title: "Seus dados, sob seu controle",
    mood: "cheer",
    teo: "Ninguém vê seus abastecimentos. Você baixa tudo em planilha ou apaga a conta quando quiser, direto no Perfil.",
    visual: (
      <Panel>
        <div className="flex items-start gap-3 text-sm text-white">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#4FD39A]" />
          <ul className="space-y-1.5 text-white/85">
            <li>Só você vê seus registros</li>
            <li>Exportar em planilha (CSV)</li>
            <li>Excluir a conta a qualquer momento</li>
          </ul>
        </div>
      </Panel>
    ),
  },
];

export function TeoStories({
  onDone,
  doneLabel = "Começar",
}: {
  /** Chamado ao terminar ("completed") ou pular ("skipped"). */
  onDone: (reason: "completed" | "skipped") => void;
  doneLabel?: string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const last = index === STORIES.length - 1;
  const story = STORIES[index];
  const autoplay = !reduce;

  const next = useCallback(() => {
    setProgress(0);
    if (index >= STORIES.length - 1) onDone("completed");
    else setIndex(index + 1);
  }, [index, onDone]);

  const previous = useCallback(() => {
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Avanço automático, com pausa enquanto a pessoa segura o dedo. Para no último story.
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (!autoplay || paused || last) return;
    let start: number | null = null;
    const from = progress;
    const tick = (t: number) => {
      if (start === null) start = t;
      const value = Math.min(1, from + (t - start) / STORY_MS);
      setProgress(value);
      if (value >= 1) next();
      else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // progress é lido só no início de cada trecho (retomar de onde parou).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, paused, last, index, next]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "Escape") onDone("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onDone]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Como o Tanque+ funciona"
      className="fixed inset-0 z-50 flex justify-center bg-[#141A2C]"
    >
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-[radial-gradient(120%_70%_at_50%_0%,#1E9A6633_0%,transparent_60%)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* barras de progresso */}
        <div className="flex gap-1.5" aria-hidden="true">
          {STORIES.map((s, i) => (
            <div key={s.title} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: `${i < index ? 100 : i === index ? (last || !autoplay ? 100 : progress * 100) : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-white">
          <span className="text-sm font-semibold">Tanque+</span>
          <button
            type="button"
            onClick={() => onDone("skipped")}
            className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-white/80"
          >
            Pular <X className="h-4 w-4" />
          </button>
        </div>

        {/* áreas de toque: esquerda volta, direita avança; segurar pausa */}
        <div className="absolute inset-x-0 bottom-28 top-24 z-0 flex">
          <button
            type="button"
            aria-label="Anterior"
            className="h-full w-1/3"
            onClick={previous}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          />
          <button
            type="button"
            aria-label="Próximo"
            className="h-full w-2/3"
            onClick={next}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="pointer-events-none relative z-10 flex flex-1 flex-col justify-center gap-6"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            aria-live="polite"
          >
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-white">
              {story.title}
            </h2>
            {story.visual}
            <div className="flex items-start gap-3">
              <TeoAvatar spot={`tour-${index}`} size="md" mood={story.mood} />
              <p className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[0.95rem] leading-relaxed text-[#141A2C]">
                {story.teo}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={next}
          className="relative z-10 mt-4 inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-full bg-[#178559] px-6 text-base font-semibold text-white"
        >
          {last ? (
            doneLabel
          ) : (
            <>
              Próximo <ChevronRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
