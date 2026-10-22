import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { AppCard } from "@/components/app/Surface";
import { TeoAvatar } from "@/components/app/Teo";
import { track } from "@/lib/analytics";
import { phraseInsight } from "@/lib/tanque-ia.functions";
import { teoNoteOfTheDay } from "@/content/teo-tips";
import type { useHomeData } from "@/hooks/use-tanque";

/** Teo completo: análise dos números com a TanqueIA. Fica no Painel. */
export function TanqueIALine({
  insights,
  brand,
  dataKey,
}: {
  insights: ReturnType<typeof useHomeData>["insights"];
  brand: string;
  /** Muda quando os registros mudam, para a frase ser refeita. */
  dataKey: string;
}) {
  const main = insights[0];
  /** Sem dados suficientes a IA não é acionada: ela interpreta números, não os inventa. */
  const hasData = !!main && main.id !== "empty";
  const phrase = useServerFn(phraseInsight);
  /** Sem números para comentar, o Teo traz uma curiosidade da marca ou uma dica do dia. */
  const note = hasData ? null : teoNoteOfTheDay(brand);

  const ai = useQuery({
    queryKey: ["tanque-ia", dataKey],
    enabled: hasData,
    staleTime: 15 * 60_000,
    retry: 1,
    queryFn: async () => {
      track("tanque_ia_requested");
      return phrase();
    },
  });

  useEffect(() => {
    if (ai.data?.text) track("tanque_ia_answered", { length: ai.data.text.length });
  }, [ai.data?.text]);

  const text =
    ai.data?.text ?? main?.body ?? "Com dois tanques cheios, eu calculo seu consumo real.";

  return (
    <AppCard className="border-primary/25 bg-accent/40">
      <div className="flex items-center gap-3">
        <TeoAvatar spot="home-insight" size="sm" mood="tip" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">Teo</p>
          <p className="text-xs text-muted-foreground">sua TanqueIA</p>
        </div>
      </div>
      {note ? (
        <>
          <p className="mt-3 text-xs font-semibold text-primary">{note.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{note.text}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Com dois tanques cheios registrados, eu passo a comentar os seus números.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          {ai.isFetching ? "Analisando seus números…" : text}
        </p>
      )}
      {hasData && !ai.isFetching ? (
        <p className="mt-2 text-xs text-muted-foreground">Calculado com os seus registros.</p>
      ) : null}
    </AppCard>
  );
}
