import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isStandalone } from "@/lib/install";
import { haptic } from "@/components/app/Confetti";

const TRIGGER = 72;

/**
 * Puxar para atualizar, como no Instagram. Só no app instalado: no navegador, o próprio
 * Chrome já faz isso. Atualiza os dados (não recarrega a página).
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    if (!isStandalone()) return;
    const onStart = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
      armed.current = false;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null || refreshing) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0) return setPull(0);
      const value = Math.min(120, dy * 0.5);
      if (value >= TRIGGER && !armed.current) {
        armed.current = true;
        haptic(10);
      }
      setPull(value);
    };
    const onEnd = async () => {
      if (start.current === null) return;
      start.current = null;
      if (armed.current) {
        setRefreshing(true);
        setPull(TRIGGER * 0.6);
        await client.invalidateQueries();
        setRefreshing(false);
      }
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [client, refreshing]);

  return (
    <div>
      <div
        aria-hidden={!refreshing}
        className="flex items-end justify-center overflow-hidden text-primary transition-[height]"
        style={{ height: pull }}
      >
        <Loader2
          className={`mb-2 h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          style={{
            transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
            opacity: pull / TRIGGER,
          }}
        />
      </div>
      {children}
    </div>
  );
}
