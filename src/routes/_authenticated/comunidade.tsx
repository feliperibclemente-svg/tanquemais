import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flag, MessageSquarePlus, Trash2 } from "lucide-react";
import {
  Action,
  AppCard,
  AppShell,
  ChoiceGroup,
  ConfirmAction,
  EmptyState,
  ErrorState,
  PageHeader,
  ScreenSkeleton,
  TextAreaField,
} from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { publishTip } from "@/lib/community.functions";
import {
  COMMUNITY_MAX,
  COMMUNITY_MIN,
  COMMUNITY_RULES,
  COMMUNITY_TOPICS,
  REPORT_REASONS,
  TOPIC_LABEL,
  hasLink,
} from "@/content/community";
import { relativeDate } from "@/lib/format";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/comunidade")({
  head: () => ({
    meta: [
      { title: "Comunidade — Tanque+" },
      { name: "description", content: "Dicas de consumo e economia de outros motoristas." },
    ],
  }),
  component: CommunityPage,
});

interface FeedItem {
  id: string;
  topic: string;
  content: string;
  status: string;
  created_at: string;
  mine: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Em análise: aparece no mural depois de revisada",
  em_revisao: "Em revisão: saiu do mural após uma denúncia",
  aprovada: "Publicada no mural",
};

function useFeed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["community-feed", user?.id ?? ""],
    enabled: !!user,
    queryFn: async (): Promise<FeedItem[]> => {
      const { data, error } = await supabase.rpc("community_feed");
      if (error) throw error;
      return (data ?? []) as FeedItem[];
    },
  });
}

function CommunityPage() {
  const feed = useFeed();
  const [topic, setTopic] = useState<string>("todas");

  const items = useMemo(
    () => (feed.data ?? []).filter((i) => topic === "todas" || i.topic === topic),
    [feed.data, topic],
  );

  return (
    <AppShell>
      <PageHeader title="Comunidade" subtitle="Dicas de quem também abastece" />

      <Composer />

      {feed.isLoading ? (
        <div className="mt-5">
          <ScreenSkeleton cards={2} />
        </div>
      ) : feed.isError ? (
        <div className="mt-5">
          <ErrorState onRetry={() => feed.refetch()} />
        </div>
      ) : (
        <>
          {(feed.data ?? []).length > 0 ? (
            <div className="mt-5">
              <ChoiceGroup
                label="Filtrar por tema"
                value={topic}
                onChange={setTopic}
                options={[
                  { value: "todas", label: "Todas" },
                  ...COMMUNITY_TOPICS.map((t) => ({ value: t.id, label: t.label })),
                ]}
              />
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <EmptyState
                emoji="💬"
                title={
                  (feed.data ?? []).length ? "Nenhuma dica nesse tema" : "Ainda não há dicas aqui"
                }
                description="Que tal compartilhar a primeira? Uma experiência real ajuda mais do que parece."
              />
            ) : (
              items.map((item) => <TipCard key={item.id} item={item} />)
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Composer() {
  const client = useQueryClient();
  const publish = useServerFn(publishTip);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const length = content.trim().length;
  const linkWarning = hasLink(content);

  const send = useMutation({
    mutationFn: () => publish({ data: { topic, content } }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        track("community_tip_rejected");
        return;
      }
      track("community_tip_sent", { topic });
      toast.success("Recebemos sua dica. Ela aparece no mural depois de revisada.");
      setContent("");
      setTopic("");
      setOpen(false);
      void client.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: () => setError("Não consegui enviar agora. Tente de novo em instantes."),
  });

  if (!open) {
    return (
      <Action size="lg" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-5 w-5" /> Compartilhar uma dica
      </Action>
    );
  }

  return (
    <AppCard className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Tema</p>
        <ChoiceGroup
          label="Tema da dica"
          value={topic}
          onChange={setTopic}
          options={COMMUNITY_TOPICS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>
      <TextAreaField
        label="Sua dica ou experiência"
        value={content}
        maxLength={COMMUNITY_MAX}
        placeholder="Ex.: Passei a calibrar os pneus toda semana e o consumo na estrada melhorou."
        onChange={(e) => {
          setContent(e.target.value);
          setError(null);
        }}
        hint={`${length}/${COMMUNITY_MAX}`}
        error={linkWarning ? "Links não são aceitos na comunidade." : undefined}
      />
      <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
        {COMMUNITY_RULES.map((rule) => (
          <li key={rule}>• {rule}</li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Action
          variant="ghost"
          size="md"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancelar
        </Action>
        <Action
          size="md"
          loading={send.isPending}
          disabled={!topic || length < COMMUNITY_MIN || linkWarning}
          onClick={() => send.mutate()}
        >
          Enviar
        </Action>
      </div>
    </AppCard>
  );
}

function TipCard({ item }: { item: FeedItem }) {
  const client = useQueryClient();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("community_delete", { _post_id: item.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dica apagada.");
      void client.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: () => toast.error("Não consegui apagar agora. Tente de novo."),
  });

  const report = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("community_report", {
        _post_id: item.id,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      track("community_tip_reported", { reason });
      toast.success("Obrigado. A dica saiu do mural e vai ser revisada.");
      void client.invalidateQueries({ queryKey: ["community-feed"] });
    },
    onError: () => toast.error("Não consegui enviar a denúncia. Tente de novo."),
  });

  return (
    <AppCard className={item.mine && item.status !== "aprovada" ? "border-dashed" : undefined}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-primary">
          {TOPIC_LABEL[item.topic] ?? item.topic}
        </span>
        <span>
          {item.mine ? "Você" : "Motorista"} · {relativeDate(item.created_at)}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
        {item.content}
      </p>

      {item.mine ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{STATUS_LABEL[item.status]}</p>
          <ConfirmAction
            title="Apagar esta dica?"
            description="Ela sai do mural e não pode ser recuperada."
            confirmLabel="Apagar"
            onConfirm={() => remove.mutate()}
            trigger={
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" /> Apagar
              </button>
            }
          />
        </div>
      ) : reporting ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <p className="text-sm font-medium text-foreground">O que há de errado?</p>
          <ChoiceGroup
            label="Motivo da denúncia"
            value={reason}
            onChange={setReason}
            options={REPORT_REASONS.map((r) => ({ value: r.id, label: r.label }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Action variant="ghost" size="md" onClick={() => setReporting(false)}>
              Cancelar
            </Action>
            <Action
              variant="danger"
              size="md"
              disabled={!reason}
              loading={report.isPending}
              onClick={() => report.mutate()}
            >
              Denunciar
            </Action>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <Flag className="h-3.5 w-3.5" /> Denunciar
          </button>
        </div>
      )}
    </AppCard>
  );
}
