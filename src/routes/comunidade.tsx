import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Trophy, UserPlus, Users } from "lucide-react";
import { Card, MobileShell, PageTitle } from "@/components/MobileShell";
import { PostCard } from "@/components/PostCard";
import { summary, useFillups } from "@/lib/tanque";
import {
  CLUBS,
  RANKINGS,
  SEED_POSTS,
  communityInsights,
  toggle,
  useCommunityPosts,
  useSocial,
} from "@/lib/community";

export const Route = createFileRoute("/comunidade")({
  head: () => ({
    meta: [
      { title: "Comunidade — Tanque+" },
      {
        name: "description",
        content:
          "Feed colaborativo de preços, postos confiáveis e economia entre motoristas brasileiros.",
      },
      { property: "og:title", content: "Comunidade Tanque+" },
      {
        property: "og:description",
        content: "Cada abastecimento compartilhado ajuda milhares de motoristas a gastar menos.",
      },
    ],
  }),
  component: Comunidade,
});

const feedTabs = [
  { key: "todos", label: "Todos" },
  { key: "amigos", label: "Amigos" },
  { key: "local", label: "Local" },
  { key: "clube", label: "Clubes" },
] as const;

const rankTabs = [
  { key: "economia", label: "Economia" },
  { key: "contribuicao", label: "Contribuições" },
  { key: "confiabilidade", label: "Confiabilidade" },
] as const;

function Comunidade() {
  const social = useSocial();
  const posts = useCommunityPosts();
  const fillups = useFillups();
  const [view, setView] = useState<"feed" | "clubes" | "ranking">("feed");
  const [feed, setFeed] = useState<(typeof feedTabs)[number]["key"]>("todos");
  const [rank, setRank] = useState<(typeof rankTabs)[number]["key"]>("economia");
  const [period, setPeriod] = useState<"Semanal" | "Mensal">("Semanal");

  const all = useMemo(() => [...posts.value, ...SEED_POSTS], [posts.value]);
  const visible = feed === "todos" ? all : all.filter((p) => p.scope === feed);
  const insights = communityInsights(summary(fillups.value).avg);

  return (
    <MobileShell>
      <PageTitle title="Comunidade" subtitle="Motoristas ajudando motoristas a gastar menos" />

      <div className="mb-4 flex gap-2 rounded-3xl bg-muted p-1">
        {(["feed", "clubes", "ranking"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-medium capitalize transition-colors ${
              view === v
                ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "feed" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">TanqueIA da comunidade</p>
            </div>
            {insights.map((i) => (
              <p key={i} className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                {i}
              </p>
            ))}
          </Card>

          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {feedTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFeed(t.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  feed === t.key
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <Card className="text-center text-sm text-muted-foreground">
              Nenhuma publicação neste filtro ainda.
            </Card>
          ) : (
            visible.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                liked={social.value.likes.includes(p.id)}
                saved={social.value.saved.includes(p.id)}
                reported={social.value.reported.includes(p.id)}
                onLike={() =>
                  social.setValue({ ...social.value, likes: toggle(social.value.likes, p.id) })
                }
                onSave={() =>
                  social.setValue({ ...social.value, saved: toggle(social.value.saved, p.id) })
                }
                onReport={() =>
                  social.setValue({
                    ...social.value,
                    reported: toggle(social.value.reported, p.id),
                  })
                }
                onShare={() => {
                  const text = `${p.station} — ${p.fuel} a R$ ${p.pricePerLiter.toFixed(2)}/L (Tanque+)`;
                  if (navigator.share) void navigator.share({ text }).catch(() => {});
                  else void navigator.clipboard?.writeText(text);
                }}
                onConfirm={() =>
                  social.setValue({
                    ...social.value,
                    confirmations: social.value.confirmations + 1,
                  })
                }
              />
            ))
          )}
        </div>
      )}

      {view === "clubes" && (
        <div className="space-y-3">
          {CLUBS.map((c) => {
            const joined = social.value.clubs.includes(c.id);
            return (
              <Card key={c.id} className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-lg">
                  {c.emoji}
                </span>
                <Link to="/clube/$clubId" params={{ clubId: c.id }} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {c.members.toLocaleString("pt-BR")} membros
                  </p>
                </Link>
                <button
                  onClick={() =>
                    social.setValue({ ...social.value, clubs: toggle(social.value.clubs, c.id) })
                  }
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                    joined ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {joined ? "Participando" : "Entrar"}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {view === "ranking" && (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-3xl bg-muted p-1">
            {(["Semanal", "Mensal"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 rounded-2xl py-2 text-xs font-medium ${
                  period === p ? "bg-card text-foreground" : "text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {rankTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setRank(t.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium ${
                  rank === t.key
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Card className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-primary" /> Ranking {period.toLowerCase()} · {rank}
            </p>
            {RANKINGS[rank].map((row, i) => (
              <div
                key={row.name}
                className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3"
              >
                <span className="w-5 text-sm font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.city}</p>
                </div>
                <p className="text-xs font-semibold text-foreground">{row.value}</p>
              </div>
            ))}
          </Card>
          <Card className="flex items-center gap-3">
            <UserPlus className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Você segue {social.value.following.length} motorista(s). Siga mais pessoas para ver o
              feed de amigos.
            </p>
          </Card>
        </div>
      )}
    </MobileShell>
  );
}
