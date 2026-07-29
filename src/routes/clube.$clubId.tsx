import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarDays, MessageSquare, Trophy } from "lucide-react";
import { Card } from "@/components/MobileShell";
import { PostCard } from "@/components/PostCard";
import { CLUBS, RANKINGS, SEED_POSTS, toggle, useSocial } from "@/lib/community";

export const Route = createFileRoute("/clube/$clubId")({
  loader: ({ params }) => {
    const club = CLUBS.find((c) => c.id === params.clubId);
    if (!club) throw notFound();
    return { club };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Clube não encontrado — Tanque+" }, { name: "robots", content: "noindex" }],
      };
    const t = `Clube ${loaderData.club.name} — Tanque+`;
    return {
      meta: [
        { title: t },
        { name: "description", content: loaderData.club.description },
        { property: "og:title", content: t },
        { property: "og:description", content: loaderData.club.description },
      ],
    };
  },
  component: ClubePage,
});

const tabs = ["Feed", "Ranking", "Estatísticas", "Eventos", "Discussões"] as const;

function ClubePage() {
  const { club } = Route.useLoaderData();
  const social = useSocial();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Feed");
  const joined = social.value.clubs.includes(club.id);
  const posts = SEED_POSTS.filter((p) => p.club === club.name || p.scope === "clube");

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <Link
        to="/comunidade"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Comunidade
      </Link>

      <Card className="mt-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl">
          {club.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{club.name}</p>
          <p className="text-xs text-muted-foreground">
            {club.members.toLocaleString("pt-BR")} membros
          </p>
        </div>
        <button
          onClick={() =>
            social.setValue({ ...social.value, clubs: toggle(social.value.clubs, club.id) })
          }
          className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
            joined ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          {joined ? "Participando" : "Entrar"}
        </button>
      </Card>

      <p className="mt-3 text-sm text-muted-foreground">{club.description}</p>

      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium ${
              tab === t
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4 pb-10">
        {tab === "Feed" &&
          posts.map((p) => (
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
                social.setValue({ ...social.value, reported: toggle(social.value.reported, p.id) })
              }
              onShare={() => void navigator.clipboard?.writeText(`${p.station} — ${p.fuel}`)}
              onConfirm={() =>
                social.setValue({ ...social.value, confirmations: social.value.confirmations + 1 })
              }
            />
          ))}

        {tab === "Ranking" && (
          <Card className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-primary" /> Melhores colaboradores do clube
            </p>
            {RANKINGS.contribuicao.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
                <span className="w-5 text-sm font-bold text-primary">{i + 1}</span>
                <p className="flex-1 truncate text-sm text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.value}</p>
              </div>
            ))}
          </Card>
        )}

        {tab === "Estatísticas" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Consumo médio do clube", "12,8 km/L"],
              ["Preço médio pago", "R$ 5,74/L"],
              ["Economia média/mês", "R$ 68"],
              ["Preços enviados na semana", "1.284"],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === "Eventos" && (
          <Card className="space-y-3">
            {[
              ["Mutirão de preços", "Sábado, 09h"],
              ["Encontro de donos", "Domingo, 16h"],
            ].map(([title, when]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{when}</p>
                </div>
              </div>
            ))}
          </Card>
        )}

        {tab === "Discussões" && (
          <Card className="space-y-3">
            {[
              ["Vale a pena aditivada nesse motor?", "23 respostas"],
              ["Melhor calibragem para economia", "17 respostas"],
              ["Etanol está compensando em Goiânia?", "41 respostas"],
            ].map(([title, replies]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{replies}</p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
