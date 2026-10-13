import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, FlaskConical, LogOut, MessageSquareHeart, Moon, Sun, Trash2 } from "lucide-react";
import {
  Action,
  ActionLink,
  AppCard,
  AppShell,
  ConfirmAction,
  PageHeader,
  ScreenSkeleton,
  SelectField,
  StatTile,
} from "@/components/ds";

import { brl, kmPerLiter, liters as fmtLiters } from "@/lib/format";
import { useHomeData, useProfile, useUpdateProfile } from "@/hooks/use-tanque";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { track } from "@/lib/analytics";
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "@/constants/app";
import { deleteMyAccount } from "@/lib/account.functions";
import { queuedFuelings } from "@/lib/offline-queue";

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

  const path = useRouterState({ select: (s) => s.location.pathname });
  const removeAccount = useServerFn(deleteMyAccount);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
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

  /** Exporta perfil, veículos, abastecimentos e feedbacks em JSON. */
  async function exportData() {
    if (!user) return;
    setBusy("export");
    try {
      const [p, v, f, fb] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("vehicles").select("*").eq("user_id", user.id),
        supabase.from("fuelings").select("*").eq("user_id", user.id).order("filled_at"),
        supabase.from("feedback").select("*").eq("user_id", user.id),
      ]);
      const error = p.error ?? v.error ?? f.error ?? fb.error;
      if (error) throw error;
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              email: user.email,
              profile: p.data,
              vehicles: v.data,
              fuelings: f.data,
              feedback: fb.data,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tanque-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não conseguimos gerar o arquivo agora. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      await removeAccount();
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("Sua conta e seus dados foram excluídos.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não conseguimos excluir sua conta agora.");
      setBusy(null);
    }
  }

  async function signOut() {
    const pending = queuedFuelings().filter((i) => i.userId === user?.id).length;
    if (
      pending > 0 &&
      !window.confirm(
        `Você tem ${pending} abastecimento(s) ainda não enviado(s). Eles serão enviados quando você entrar de novo neste aparelho. Sair mesmo assim?`,
      )
    )
      return;
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
            Opcional. Usado apenas de forma agregada para entender quem usa o beta. Apague quando
            quiser escolhendo 'Não preenchido'.
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
          <p className="text-sm font-semibold text-foreground">Versão beta</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Você está usando uma versão de testes. Algumas funcionalidades ainda vão evoluir — sua
            opinião decide o que vem primeiro.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <ActionLink to="/feedback" search={{ from: path }} size="md" className="w-full sm:w-auto">
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

        <AppCard>
          <p className="text-sm font-semibold text-foreground">Seus dados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Para baixar ou excluir sua conta e seus dados, escreva para{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary">
              {SUPPORT_EMAIL}
            </a>
            . Atendemos em até 15 dias.
          </p>
          <p className="mt-2 text-xs">
            <a
              href={PRIVACY_URL}
              className="font-semibold text-primary"
            >
              Privacidade
            </a>
            <span className="text-muted-foreground"> · </span>
            <a
              href={TERMS_URL}
              className="font-semibold text-primary"
            >
              Termos
            </a>
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Action variant="secondary" size="md" loading={busy === "export"} onClick={exportData}>
              <Download className="h-4 w-4" /> Baixar meus dados
            </Action>
            <ConfirmAction
              title="Excluir sua conta?"
              description="Sua conta, veículos, abastecimentos e feedbacks serão apagados permanentemente. Isso não pode ser desfeito."
              confirmLabel="Excluir conta"
              onConfirm={deleteAccount}
              trigger={
                <Action variant="danger" size="md" loading={busy === "delete"}>
                  <Trash2 className="h-4 w-4" /> Excluir minha conta
                </Action>
              }
            />
          </div>
        </AppCard>

        <Action variant="danger" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sair da conta
        </Action>
      </section>
    </AppShell>
  );
}
