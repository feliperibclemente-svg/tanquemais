import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ActionLink, AppShell, EmptyState, PageHeader, ScreenSkeleton } from "@/components/ds";
import { RecapStories } from "@/components/app/RecapStories";
import { markRecapSeen, useMonthlyRecap } from "@/hooks/use-recap";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/retrospectiva")({
  head: () => ({ meta: [{ title: "Sua retrospectiva — Tanque+" }] }),
  component: RecapPage,
});

function RecapPage() {
  const navigate = useNavigate();
  const { recap, isLoading } = useMonthlyRecap();

  useEffect(() => {
    if (recap) {
      markRecapSeen(recap.key);
      track("recap_opened", { month: recap.key, slides: recap.slides.length });
    }
  }, [recap]);

  if (isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={2} />
      </AppShell>
    );
  }
  if (!recap) {
    return (
      <AppShell>
        <PageHeader title="Retrospectiva" />
        <EmptyState
          emoji="🎬"
          title="Sua retrospectiva ainda não está pronta"
          description="Registre seus abastecimentos do mês. Com 2 registros, eu já monto a sua."
          action={
            <ActionLink to="/abastecer" size="md" className="mt-1">
              Registrar abastecimento
            </ActionLink>
          }
        />
      </AppShell>
    );
  }
  return <RecapStories recap={recap} onClose={() => navigate({ to: "/app" })} />;
}
