import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { TeoAvatar } from "@/components/app/Teo";
import { BrandMark } from "@/components/app/Logo";
import { THEME_COLORS, shareCard, toFirstPerson } from "@/lib/share-image";
import type { MonthlyRecap } from "@/services/recap";

/**
 * Retrospectiva do mês em stories: um número grande por tela, cores fortes e botão de
 * compartilhar em cada uma (gera a imagem no formato de story). Toque à direita avança,
 * à esquerda volta. A tela mostra o mesmo que a imagem compartilhada.
 */
export function RecapStories({ recap, onClose }: { recap: MonthlyRecap; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const reduce = useReducedMotion();
  const slide = recap.slides[index];
  const last = index === recap.slides.length - 1;
  const colors = THEME_COLORS[slide.theme];
  const isSummary = slide.id === "resumo";

  const next = useCallback(() => {
    if (last) onClose();
    else setIndex((i) => i + 1);
  }, [last, onClose]);
  const previous = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onClose]);

  async function share() {
    setSharing(true);
    try {
      const result = await shareCard(
        {
          theme: slide.theme,
          eyebrow: toFirstPerson(slide.eyebrow),
          big: slide.big,
          title: toFirstPerson(slide.title),
          caption: slide.caption ? toFirstPerson(slide.caption) : undefined,
          rows: isSummary ? recap.summary : undefined,
        },
        `retrospectiva-${slide.id}`,
      );
      if (result === "downloaded") toast.success("Imagem salva. É só postar onde quiser.");
    } catch {
      toast.error("Não consegui gerar a imagem agora. Tente de novo.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Retrospectiva de ${recap.monthName}`}
      className="fixed inset-0 z-50 flex justify-center bg-black"
    >
      <div
        className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] transition-colors duration-300"
        style={{
          background: `linear-gradient(160deg, ${colors.from}, ${colors.to})`,
          color: colors.fg,
        }}
      >
        <div className="flex gap-1.5" aria-hidden="true">
          {recap.slides.map((s, i) => (
            <div
              key={s.id}
              className="h-1 flex-1 rounded-full"
              style={{ background: colors.fg, opacity: i <= index ? 0.95 : 0.25 }}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
              <BrandMark className="h-5" title="" />
            </span>
            Tanque+
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* áreas de toque: esquerda volta, direita avança */}
        <div className="absolute inset-x-0 bottom-32 top-24 z-0 flex">
          <button type="button" aria-label="Anterior" className="h-full w-1/3" onClick={previous} />
          <button type="button" aria-label="Próximo" className="h-full w-2/3" onClick={next} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="pointer-events-none relative z-10 flex flex-1 flex-col justify-center"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            aria-live="polite"
          >
            <p className="text-lg font-semibold" style={{ color: colors.sub }}>
              {slide.eyebrow}
            </p>
            {slide.big ? (
              <p className="mt-2 text-[clamp(3rem,16vw,5rem)] font-extrabold leading-none tracking-tight">
                {slide.big}
              </p>
            ) : null}
            <p
              className={
                slide.big
                  ? "mt-4 text-2xl font-bold leading-tight"
                  : "mt-3 text-[2.5rem] font-extrabold leading-[1.1] tracking-tight"
              }
            >
              {slide.title}
            </p>
            {slide.caption ? (
              <p className="mt-3 text-base" style={{ color: colors.sub }}>
                {slide.caption}
              </p>
            ) : null}

            {isSummary ? (
              <dl className="mt-6 divide-y divide-white/15 rounded-3xl bg-white/15 px-5">
                {recap.summary.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3">
                    <dt className="text-sm" style={{ color: colors.sub }}>
                      {row.label}
                    </dt>
                    <dd className="text-lg font-extrabold">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {slide.id === "abertura" ? (
              <div className="mt-8 flex items-center gap-3">
                <TeoAvatar spot="recap" size="md" mood="cheer" />
                <p className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[0.95rem] leading-relaxed text-[#141A2C]">
                  Juntei seu mês em poucas telas. Toque para avançar e compartilhe o que quiser.
                </p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={share}
            disabled={sharing}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-4 text-base font-semibold disabled:opacity-60"
            style={{ borderColor: colors.fg }}
          >
            <Share2 className="h-5 w-5" /> {sharing ? "Gerando…" : "Compartilhar"}
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-full px-4 text-base font-semibold"
            style={{ background: colors.fg, color: colors.to }}
          >
            {last ? "Concluir" : "Próximo"} {last ? null : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
