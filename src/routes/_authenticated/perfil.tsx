import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  FlaskConical,
  LogOut,
  MessageSquareHeart,
  Camera,
  Moon,
  Pencil,
  Sun,
  Trash2,
} from "lucide-react";
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
  TextField,
} from "@/components/ds";

import { brl, kmPerLiter, liters as fmtLiters } from "@/lib/format";
import { useHomeData, useProfile, useUpdateProfile } from "@/hooks/use-tanque";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { track } from "@/lib/analytics";
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "@/constants/app";
import { deleteMyAccount } from "@/lib/account.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { queuedFuelings } from "@/lib/offline-queue";
import { photoToAvatarDataUrl } from "@/lib/image";
import { profileSchema } from "@/validators";
import type { Profile } from "@/types/domain";

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
  const [editing, setEditing] = useState(false);
  const checkAdmin = useServerFn(amIAdmin);
  const admin = useQuery({
    queryKey: ["am-i-admin", user?.id ?? ""],
    enabled: !!user,
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: () => checkAdmin(),
  });
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
          <Avatar url={data?.avatar_url ?? null} name={data?.full_name ?? user?.email ?? "T"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">
              {data?.full_name || "Motorista Tanque+"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {[data?.city, data?.state].filter(Boolean).join(" · ") || user?.email}
            </p>
          </div>
          {!editing ? (
            <Action variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Action>
          ) : null}
        </div>
        {editing && data ? <ProfileEditor profile={data} onDone={() => setEditing(false)} /> : null}
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
            <ActionLink
              to="/feedback"
              search={{ from: path } as never}
              size="md"
              className="w-full sm:w-auto"
            >
              <MessageSquareHeart className="h-4 w-4" /> Enviar feedback
            </ActionLink>
            <ActionLink to="/beta" variant="secondary" size="md" className="w-full sm:w-auto">
              <FlaskConical className="h-4 w-4" /> Sobre o Beta
            </ActionLink>
            {admin.data?.admin ? (
              <ActionLink to="/admin" variant="secondary" size="md" className="w-full sm:w-auto">
                <BarChart3 className="h-4 w-4" /> Painel do beta
              </ActionLink>
            ) : null}
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
            <a href={PRIVACY_URL} className="font-semibold text-primary">
              Privacidade
            </a>
            <span className="text-muted-foreground"> · </span>
            <a href={TERMS_URL} className="font-semibold text-primary">
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

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

function Avatar({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "h-20 w-20 text-2xl" : "h-14 w-14 text-xl";
  return url ? (
    <img
      src={url}
      alt=""
      className={`${box} shrink-0 rounded-3xl object-cover`}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-3xl bg-accent font-bold text-accent-foreground`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const editorSchema = profileSchema.pick({ full_name: true, city: true, state: true });

/** Edição de foto, nome, cidade e estado. A cidade ajuda nas comparações regionais de preço. */
function ProfileEditor({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(profile.full_name ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [photo, setPhoto] = useState<string | null>(profile.avatar_url ?? null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      setPhoto(await photoToAvatarDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não conseguimos usar essa foto.");
    } finally {
      setProcessing(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = editorSchema.safeParse({ full_name: name, city, state });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados.");
      return;
    }
    try {
      await update.mutateAsync({
        full_name: parsed.data.full_name,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        avatar_url: photo,
      });
      track("profile_updated", { photo: !!photo, city: !!parsed.data.city });
      toast.success("Perfil atualizado");
      onDone();
    } catch {
      /* o hook já mostra o erro */
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-4">
        <Avatar url={photo} name={name || "T"} size="lg" />
        <div className="flex flex-col items-start gap-1">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
            <Camera className="h-4 w-4" />
            {processing ? "Preparando foto…" : photo ? "Trocar foto" : "Adicionar foto"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void pickPhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {photo ? (
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="min-h-8 text-xs font-medium text-muted-foreground"
            >
              Remover foto
            </button>
          ) : null}
        </div>
      </div>

      <TextField
        label="Nome"
        value={name}
        autoComplete="name"
        onChange={(event) => setName(event.target.value)}
      />
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <TextField
          label="Cidade"
          hint="Para comparar preços da sua região"
          value={city}
          autoComplete="address-level2"
          onChange={(event) => setCity(event.target.value)}
        />
        <SelectField
          label="UF"
          value={state}
          onChange={(event) => setState(event.target.value)}
          options={[{ value: "", label: "—" }, ...UFS.map((uf) => ({ value: uf, label: uf }))]}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Action type="submit" size="md" loading={update.isPending} disabled={processing}>
          Salvar perfil
        </Action>
        <Action type="button" variant="ghost" size="md" onClick={onDone}>
          Cancelar
        </Action>
      </div>
    </form>
  );
}
