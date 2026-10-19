import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

const COLORS = ["#1E9A66", "#4FD39A", "#FFC857", "#F08A24", "#141A2C", "#7BE0AE"];

/** Pequena vibração (Android); no iPhone o navegador ignora, sem erro. */
export function haptic(pattern: number | number[] = 15) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem suporte */
  }
}

/**
 * Confete leve para comemorar conquistas (1º registro, 1º consumo, preço abaixo da média).
 * Some sozinho em ~2,5 s; com "reduzir movimento" ativo, não aparece.
 */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 9) * 0.06,
        duration: 1.6 + ((i * 13) % 10) / 10,
        size: 6 + ((i * 7) % 6),
        color: COLORS[i % COLORS.length],
        rotate: (i * 47) % 360,
        drift: ((i * 29) % 60) - 30,
      })),
    [pieces],
  );

  useEffect(() => {
    haptic([15, 40, 25]);
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  if (reduce || !visible) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-5%] block rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
