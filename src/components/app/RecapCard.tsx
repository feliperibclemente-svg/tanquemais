import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { recapSeen, useMonthlyRecap } from "@/hooks/use-recap";

/** Cartão do momento no Início: a retrospectiva do mês, até a pessoa abrir. */
export function RecapCard({ force = false }: { force?: boolean }) {
  const { recap } = useMonthlyRecap();
  if (!recap || recap.slides.length < 3) return null;
  if (!force && recapSeen(recap.key)) return null;
  const month = recap.monthName;
  return (
    <Link
      to="/retrospectiva"
      className="flex items-center gap-3 rounded-3xl bg-[linear-gradient(135deg,#1E9A66,#0D5C3B)] p-4 text-white shadow-[0_18px_40px_-22px_#1E9A66]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">
          {recap.partial ? `Seu ${month} até agora` : `Sua retrospectiva de ${month}`}
        </span>
        <span className="block text-sm text-white/80">
          {recap.partial ? "Veja e compartilhe seus números" : "Está pronta. Veja e compartilhe"}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </Link>
  );
}
