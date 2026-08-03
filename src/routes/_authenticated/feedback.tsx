import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Bug, Lightbulb, Send, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Action,
  AppCard,
  AppShell,
  ChoiceGroup,
  PageHeader,
  TextAreaField,
} from "@/components/ds";
import { feedbackRepository, type FeedbackKind } from "@/repositories";
import { useAuth } from "@/providers/AuthProvider";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/telemetry";
import { fullDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Enviar feedback — Tanque+" },
      {
        name: "description",
        content:
          "Relate um problema, sugira melhorias e avalie sua experiência no beta do Tanque+.",
      },
      { property: "og:title", content: "Enviar feedback — Tanque+" },
      {
        property: "og:description",
        content: "Sua opinião guia o que construímos a seguir no Tanque+.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackPage,
});

const kinds = [
  { value: "problema", label: "Problema", icon: Bug },
  { value: "sugestao", label: "Sugestão", icon: Lightbulb },
  { value: "elogio", label: "Elogio", icon: Sparkles },
] as const;

const MIN = 10;
const MAX = 2000;

function FeedbackPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [kind, setKind] = useState<FeedbackKind>("problema");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const history = useQuery({
    queryKey: ["feedback", user?.id ?? ""],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: () => feedbackRepository.listMine(user!.id),
  });

  const send = useMutation({
    mutationFn: () =>
      feedbackRepository.create(user!.id, { kind, rating, message, page: path }),
    onSuccess: () => {
      track("feedback_submitted", { kind, rating: rating ?? 0, length: message.length });
      queryClient.invalidateQueries({ queryKey: ["feedback", user?.id ?? ""] });
      setSent(true);
      setMessage("");
      setRating(null);
      toast.success("Feedback enviado. Obrigado por ajudar!");
    },
    onError: (err: Error) => {
      captureException(err, { scope: "feedback.create" });
      setError("Não conseguimos enviar agora. Verifique a conexão e tente de novo.");
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const text = message.trim();
    if (text.length < MIN) {
      setError(`Conte um pouco mais — pelo menos ${MIN} caracteres nos ajudam a entender.`);
      return;
    }
    send.mutate();
  }

  return (
    <AppShell fab={false}>
      <PageHeader
        title="Enviar feedback"
        subtitle="Estamos em beta e sua opinião define as próximas melhorias"
      />

      <form onSubmit={submit} className="space-y-5">
        <ChoiceGroup
          label="Do que se trata?"
          fill
          value={kind}
          onChange={(value) => {
            setKind(value as FeedbackKind);
            setSent(false);
            track("feedback_opened", { kind: value });
          }}
          options={kinds.map((k) => ({ value: k.value, label: k.label }))}
        />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Como está sua experiência?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rating === value}
                aria-label={`Nota ${value} de 5`}
                onClick={() => setRating(value)}
                className={`min-h-12 flex-1 rounded-2xl border text-base font-semibold transition-colors ${
                  rating === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            1 = frustrante · 5 = excelente (opcional)
          </p>
        </div>

        <TextAreaField
          label="Conte com suas palavras"
          value={message}
          maxLength={MAX}
          onChange={(event) => {
            setMessage(event.target.value);
            setSent(false);
          }}
          placeholder={
            kind === "problema"
              ? "O que aconteceu? Em qual tela? O que você esperava que acontecesse?"
              : "O que tornaria o Tanque+ mais útil no seu dia a dia?"
          }
          hint={`${message.trim().length}/${MAX} caracteres`}
          error={error ?? undefined}
        />

        <Action type="submit" loading={send.isPending}>
          {send.isPending ? null : <Send className="h-4 w-4" />}
          Enviar feedback
        </Action>

        {sent ? (
          <p role="status" className="text-center text-sm font-medium text-primary">
            Recebemos seu feedback. Obrigado por ajudar a construir o Tanque+.
          </p>
        ) : null}
      </form>

      {history.data && history.data.length > 0 ? (
        <section className="mt-8 space-y-3">
          <p className="text-sm font-semibold text-foreground">Seus envios</p>
          {history.data.map((item) => (
            <AppCard key={item.id} className="p-4">
              <p className="text-xs text-muted-foreground">
                {fullDate(item.created_at)} ·{" "}
                {kinds.find((k) => k.value === item.kind)?.label ?? item.kind}
                {item.rating ? ` · nota ${item.rating}` : ""}
              </p>
              <p className="mt-1.5 text-sm text-foreground">{item.message}</p>
            </AppCard>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
