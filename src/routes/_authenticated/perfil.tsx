import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FlaskConical, LogOut, MessageSquareHeart, Moon, Sun } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ChoiceGroup,
  PageHeader,
  ScreenSkeleton,
  SelectField,
  StatTile,
  ToggleRow,
} from "@/components/ds";

import { brl, kmPerLiter, liters as fmtLiters } from "@/lib/format";
import { useHomeData, useProfile, useUpdateProfile } from "@/hooks/use-tanque";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { track } from "@/lib/analytics";

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

/** Valor vazio = não preenchido (salvo como null, remove a informação). */
const ageRanges = [
  { value: "", label: "Não preenchido" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55+", label: "55+" },
  { value: "nao_informar", label: "Prefiro não informar" },
] as const;

const genders = [
  { value: "", label: "Não preenchido" },
  { value: "mulher", label: "Mulher" },
  { value: "homem", label: "Homem" },
  { value: "nao_binario", label: "Não binário" },
  { value: "outro", label: "Outro" },
  { value: "nao_informar", label: "Prefiro não informar" },
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
    track("auth_sign_out");
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
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
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
          <p className="text-sm font-semibold text-foreground">Sobre você (opcional)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajuda a entender quem usa o beta. Só você vê essas informações.
          </p>
          <div className="mt-3 space-y-3">
            <SelectField
              label="Faixa etária"
              value={data?.age_range ?? ""}
              onChange={(e) => updateProfile.mutate({ age_range: e.target.value || null })}
              options={ageRanges}
            />
            <SelectField
              label="Gênero"
              value={data?.gender ?? ""}
              onChange={(e) => updateProfile.mutate({ gender: e.target.value || null })}
              options={genders}
            />
          </div>
        </AppCard>

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Privacidade</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Define quem pode ver seu perfil quando os recursos sociais chegarem.
          </p>
          <ChoiceGroup
            label="Visibilidade do perfil"
            className="mt-3"
            fill
            value={data?.visibility ?? "private"}
            onChange={(value) =>
              updateProfile.mutate({ visibility: value as (typeof visibilities)[number]["key"] })
            }
            options={visibilities.map((v) => ({ value: v.key, label: v.label }))}
          />

          <div className="mt-3">
            <ToggleRow
              label="Ocultar quilometragem"
              checked={!!data?.hide_odometer}
              onChange={(checked) => updateProfile.mutate({ hide_odometer: checked })}
            />
          </div>
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
          <p className="text-sm font-semibold text-foreground">Beta fechado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Você está usando uma versão de testes. Algumas funcionalidades ainda vão evoluir — sua
            opinião decide o que vem primeiro.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <ActionLink to="/feedback" size="md" className="w-full sm:w-auto">
              <MessageSquareHeart className="h-4 w-4" /> Enviar feedback
            </ActionLink>
            <ActionLink to="/beta" variant="secondary" size="md" className="w-full sm:w-auto">
              <FlaskConical className="h-4 w-4" /> Sobre o Beta
            </ActionLink>
          </div>
        </AppCard>

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Em breve</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>Controle de manutenção e troca de óleo</li>
            <li>IPVA, seguro e lembretes de documentos</li>
            <li>Comunidade e ranking de economia</li>
          </ul>
        </AppCard>

        <Action variant="danger" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sair da conta
        </Action>
      </section>
    </AppShell>
  );
}
