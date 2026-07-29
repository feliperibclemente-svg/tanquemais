import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { AppCard, PageHeader, ScreenSkeleton, StatTile } from "@/components/app/Surface";
import { levelFromXp } from "@/constants/app";
import { brl, kmPerLiter, liters as fmtLiters } from "@/lib/format";
import { useHomeData, useProfile, useUpdateProfile } from "@/hooks/use-tanque";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Tanque+" },
      {
        name: "description",
        content: "Seus dados, privacidade, tema do aplicativo e resumo de economia no Tanque+.",
      },
      { property: "og:title", content: "Meu perfil — Tanque+" },
      { property: "og:description", content: "Perfil, privacidade e preferências do Tanque+." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilPage,
});

const visibilities = [
  { key: "public", label: "Público" },
  { key: "friends", label: "Amigos" },
  { key: "private", label: "Privado" },
] as const;

function PerfilPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const { stats, isLoading } = useHomeData();

  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("tanque:theme", next ? "dark" : "light");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || profile.isLoading) {
    return (
      <AppShell>
        <ScreenSkeleton cards={3} />
      </AppShell>
    );
  }

  const data = profile.data;
  const level = levelFromXp(data?.xp ?? 0);

  return (
    <AppShell>
      <PageHeader title="Perfil" subtitle={user?.email ?? undefined} />

      <AppCard>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-accent text-xl font-bold text-accent-foreground">
            {(data?.full_name ?? user?.email ?? "T").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {data?.full_name || "Motorista Tanque+"}
            </p>
            <p className="text-sm text-muted-foreground">
              Nível {level.level} · {level.title}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {level.next
              ? `${data?.xp ?? 0} XP · faltam ${level.next.xp - (data?.xp ?? 0)} para ${level.next.title}`
              : `${data?.xp ?? 0} XP · nível máximo`}
          </p>
        </div>
      </AppCard>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="Total gasto" value={brl(stats.totalSpend)} />
        <StatTile label="Litros" value={fmtLiters(stats.totalLiters)} />
        <StatTile label="Consumo médio" value={kmPerLiter(stats.avgKmPerLiter)} tone="good" />
        <StatTile label="Abastecimentos" value={String(stats.count)} />
      </div>

      <section className="mt-5 space-y-4">
        <AppCard>
          <p className="text-sm font-semibold text-foreground">Privacidade</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Define quem pode ver seu perfil quando os recursos sociais chegarem.
          </p>
          <div className="mt-3 flex gap-2">
            {visibilities.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => updateProfile.mutate({ visibility: v.key })}
                aria-pressed={data?.visibility === v.key}
                className={`min-h-11 flex-1 rounded-2xl border text-sm font-medium transition-colors ${
                  data?.visibility === v.key
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <label className="mt-3 flex min-h-14 items-center justify-between rounded-2xl border border-border px-4">
            <span className="text-sm font-medium text-foreground">Ocultar quilometragem</span>
            <input
              type="checkbox"
              checked={!!data?.hide_odometer}
              onChange={(e) => updateProfile.mutate({ hide_odometer: e.target.checked })}
              className="h-5 w-5 accent-[var(--primary)]"
            />
          </label>
        </AppCard>

        <AppCard>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex min-h-11 w-full items-center justify-between text-sm font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Tema {dark ? "escuro" : "claro"}
            </span>
            <span className="text-primary">Alternar</span>
          </button>
        </AppCard>

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Em breve</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>Controle de manutenção e troca de óleo</li>
            <li>IPVA, seguro e lembretes de documentos</li>
            <li>Comunidade e ranking de economia</li>
          </ul>
        </AppCard>

        <button
          type="button"
          onClick={signOut}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-base font-semibold text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </section>
    </AppShell>
  );
}
