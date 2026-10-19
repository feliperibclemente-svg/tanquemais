import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlayCircle, Share2 } from "lucide-react";
import {
  Action,
  ActionLink,
  AppShell,
  EmptyState,
  PageHeader,
  ScreenSkeleton,
} from "@/components/ds";
import { RecapStories } from "@/components/app/RecapStories";
import { markRecapSeen, recapSeen, useMonthlyRecap } from "@/hooks/use-recap";
import { THEME_COLORS, shareCard } from "@/lib/share-image";
import { track } from "@/lib/analytics";
import type { MonthlyRecap } from "@/services/recap";

export const Route = createFileRoute("/_authenticated/retrospectiva")({
  head: () => ({ meta: [{ title: "Meu mês — Tanque+" }] }),
  component: RecapPage,
});

/**
 * Primeira vez no mês: stories (a graça está na animação). Depois: o resumo direto,
 * com a opção de rever em stories e de compartilhar.
 */
function RecapPage() {
  const { recap, isLoading } = useMonthlyRecap();
  const [mode, setMode] = useState<"stories" | "summary" | null>(null);

  useEffect(() => {
    if (!recap || mode) return;
    const first = !recapSeen(recap.key) && recap.slides.length >= 3;
    setMode(first ? "stories" : "summary");
    track("recap_opened", { month: recap.key, mode: first ? "stories" : "summary" });
  }, [recap, mode]);

  if (isLoading || (recap && !mode)) {
    return (
      <AppShell>
        <ScreenSkeleton cards={2} />
      </AppShell>
    );
  }
  if (!recap || recap.summary.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Meu mês" />
        <EmptyState
          emoji="🎬"
          title="Seu mês ainda está começando"
          description="Registre seus abastecimentos. Com 2 registros no mês, eu monto a sua retrospectiva."
          action={
            <ActionLink to="/abastecer" size="md" className="mt-1">
              Registrar abastecimento
            </ActionLink>
          }
        />
      </AppShell>
    );
  }
  if (mode === "stories") {
    return (
      <RecapStories
        recap={recap}
        onClose={() => {
          markRecapSeen(recap.key);
          setMode("summary");
        }}
      />
    );
  }
  return <RecapSummary recap={recap} onReplay={() => setMode("stories")} />;
}

function RecapSummary({ recap, onReplay }: { recap: MonthlyRecap; onReplay: () => void }) {
  const [sharing, setSharing] = useState(false);
  const c = THEME_COLORS.verde;
  const month = recap.monthName.charAt(0).toUpperCase() + recap.monthName.slice(1);
  const label = recap.partial ? `${month}, até agora` : month;

  async function share() {
    setSharing(true);
    try {
      const result = await shareCard(
        {
          theme: "verde",
          eyebrow: label,
          big: "",
          title: "Meu mês no Tanque+",
          rows: recap.summary,
        },
        "retrospectiva-resumo",
      );
      if (result === "downloaded") toast.success("Imagem salva. É só postar onde quiser.");
    } catch {
      toast.error("Não consegui gerar a imagem agora. Tente de novo.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Meu mês"
        subtitle={recap.partial ? "Atualiza a cada abastecimento" : "Retrospectiva do mês"}
      />

      <section
        aria-label={`Resumo de ${label}`}
        className="rounded-3xl p-5 shadow-[0_18px_40px_-22px_#1E9A66]"
        style={{ background: `linear-gradient(160deg, ${c.from}, ${c.to})`, color: c.fg }}
      >
        <p className="text-sm font-semibold" style={{ color: c.sub }}>
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">Meu mês no Tanque+</p>
        <dl className="mt-4 divide-y divide-white/15 rounded-2xl bg-white/15 px-4">
          {recap.summary.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <dt className="text-sm" style={{ color: c.sub }}>
                {row.label}
              </dt>
              <dd className="text-lg font-extrabold">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-4 space-y-2">
        <Action size="lg" loading={sharing} onClick={share}>
          <Share2 className="h-5 w-5" /> Compartilhar resumo
        </Action>
        {recap.slides.length >= 3 ? (
          <Action variant="secondary" size="md" className="w-full" onClick={onReplay}>
            <PlayCircle className="h-4 w-4" /> Rever em stories
          </Action>
        ) : null}
      </div>
    </AppShell>
  );
}
