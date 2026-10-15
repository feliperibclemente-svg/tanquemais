import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Teo — a persona da TanqueIA.
 *
 * Aparece só em momentos que importam (boas-vindas, insight da Home, marcos como a
 * primeira medição de consumo). A animação de entrada roda uma vez por sessão em cada
 * lugar e respeita "reduzir movimento" do sistema. Guia de voz: docs/marca/teo.md.
 */

const SIZES = { sm: 40, md: 56, lg: 96 } as const;
type TeoSize = keyof typeof SIZES;

/** Anima só na primeira vez que este ponto do app aparece na sessão. */
function useFirstTimeInSession(spot: string) {
  const key = `tanque:teo:${spot}`;
  const [first] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !sessionStorage.getItem(key);
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* sem armazenamento: anima sempre, sem problema */
    }
  }, [key]);
  return first;
}

export function TeoAvatar({
  size = "md",
  spot,
  className,
}: {
  size?: TeoSize;
  /** Identifica o lugar no app para controlar a animação de entrada. */
  spot: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const first = useFirstTimeInSession(spot);
  const animate = first && !reduce;
  const px = SIZES[size];
  const src = px <= 48 ? "/teo/teo-96.webp" : px <= 96 ? "/teo/teo-192.webp" : "/teo/teo-384.webp";

  return (
    <motion.img
      src={src}
      width={px}
      height={px}
      alt="Teo, assistente do Tanque+"
      draggable={false}
      className={cn("shrink-0 select-none rounded-full", className)}
      style={{ width: px, height: px }}
      initial={animate ? { scale: 0.4, opacity: 0, y: 10, rotate: -12 } : false}
      animate={
        animate
          ? {
              scale: 1,
              opacity: 1,
              y: 0,
              // Pequeno "joinha": entra girando e balança antes de parar.
              rotate: [-12, 8, -5, 3, 0],
            }
          : undefined
      }
      transition={
        animate
          ? {
              scale: { type: "spring", stiffness: 420, damping: 18 },
              opacity: { duration: 0.2 },
              y: { type: "spring", stiffness: 300, damping: 20 },
              rotate: { duration: 0.9, delay: 0.15, ease: "easeOut" },
            }
          : undefined
      }
    />
  );
}

/** Teo falando: avatar + balão. O texto entra logo depois do avatar. */
export function TeoSays({
  spot,
  title,
  children,
  size = "md",
  className,
}: {
  spot: string;
  title?: ReactNode;
  children: ReactNode;
  size?: TeoSize;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <TeoAvatar spot={spot} size={size} />
      <motion.div
        className="relative min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-[var(--shadow-soft)]"
        initial={reduce ? false : { opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: reduce ? 0 : 0.25, duration: 0.25 }}
      >
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        {children}
      </motion.div>
    </div>
  );
}
