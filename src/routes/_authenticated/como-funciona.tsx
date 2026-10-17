import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { markTourSeen, TeoStories } from "@/components/app/TeoStories";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/como-funciona")({
  head: () => ({ meta: [{ title: "Como o Tanque+ funciona" }] }),
  component: HowItWorksPage,
});

/** A apresentação do Teo, para rever a qualquer momento a partir do Perfil. */
function HowItWorksPage() {
  const navigate = useNavigate();
  return (
    <TeoStories
      doneLabel="Voltar ao app"
      onDone={(reason) => {
        markTourSeen();
        track(reason === "completed" ? "tour_completed" : "tour_skipped", { from: "perfil" });
        if (window.history.length > 1) window.history.back();
        else navigate({ to: "/app", replace: true });
      }}
    />
  );
}
