import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, Download, LifeBuoy, Lock, Moon, Wrench } from "lucide-react";
import { Card, MobileShell, PageTitle } from "@/components/MobileShell";
import { brl, num, summary, THEME_KEY, useFillups, useProfile, useVehicles } from "@/lib/tanque";
import {
  BADGES,
  MISSIONS,
  computeXp,
  levelFor,
  useCommunityPosts,
  useSocial,
} from "@/lib/community";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil social — Tanque+" },
      {
        name: "description",
        content:
          "Nível, conquistas, missões, contribuições e privacidade do seu perfil no Tanque+.",
      },
      { property: "og:title", content: "Perfil — Tanque+" },
      {
        property: "og:description",
        content: "Acompanhe sua evolução, medalhas e contribuições na comunidade.",
      },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const profile = useProfile();
  const vehicles = useVehicles();
  const fillups = useFillups();
  const social = useSocial();
  const posts = useCommunityPosts();
  const s = summary(fillups.value);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) === "dark";
    setDark(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { profile: profile.value, vehicles: vehicles.value, fillups: fillups.value },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tanque-mais-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const contributions = social.value.shares + social.value.confirmations;
  const xp = computeXp({
    fillups: fillups.value.length,
    shares: social.value.shares,
    confirmations: social.value.confirmations,
    savings: s.savings,
  });
  const { current, next, progress } = levelFor(xp);

  const progressFor = (key: string) =>
    key === "fillups"
      ? fillups.value.length
      : key === "shares"
        ? social.value.shares
        : key === "confirmations"
          ? social.value.confirmations
          : s.savings;

  const badgeProgress = (id: string) =>
    ({
      b1: fillups.value.length,
      b2: fillups.value.length,
      b3: s.savings,
      b4: s.savings,
      b5: social.value.shares,
      b6: social.value.confirmations,
      b7: new Set(fillups.value.map((f) => f.station ?? "")).size,
      b8: 0,
    })[id] ?? 0;

  return (
    <MobileShell>
      <PageTitle title="Perfil" />
      <div className="space-y-4">
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary">
            {(profile.value.name || "T").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">
              {profile.value.name || "Motorista"}
            </p>
            <p className="text-xs text-muted-foreground">
              Nível {current.level} · {current.name}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{social.value.following.length}</span>{" "}
              seguindo
            </p>
            <p>
              <span className="font-semibold text-foreground">{12 + contributions}</span> seguidores
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-foreground">{xp} XP</p>
            <p className="text-xs text-muted-foreground">
              {next ? `Faltam ${next.xp - xp} XP para ${next.name}` : "Nível máximo alcançado"}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Quilometragem"
            value={social.value.hideOdometer ? "Oculta" : `${num(s.km, 0)} km`}
          />
          <Stat label="Total gasto" value={brl(s.totalSpend)} />
          <Stat label="Economia acumulada" value={brl(s.savings)} />
          <Stat label="Consumo médio" value={`${num(s.avg)} km/L`} />
          <Stat label="Abastecimentos" value={String(fillups.value.length)} />
          <Stat label="Contribuições" value={String(contributions)} />
        </div>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Missões</p>
          {MISSIONS.map((m) => {
            const done = Math.min(progressFor(m.progressKey), m.goal);
            const pct = (done / m.goal) * 100;
            return (
              <div key={m.id} className="rounded-2xl bg-muted p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {m.period} · +{m.xp} XP
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {num(done, 0)}/{m.goal}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-foreground">Conquistas</p>
          <div className="grid grid-cols-4 gap-3">
            {BADGES.map((b) => {
              const unlocked = badgeProgress(b.id) >= b.goal;
              return (
                <div
                  key={b.id}
                  title={`${b.title} — ${b.description}`}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition-all ${
                    unlocked ? "fade-up bg-primary-soft" : "bg-muted opacity-60"
                  }`}
                >
                  <span className={`text-xl ${unlocked ? "" : "grayscale"}`}>{b.icon}</span>
                  <span className="text-[9px] leading-tight text-muted-foreground">{b.title}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Veículos</p>
          {vehicles.value.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
              <Car className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {v.brand} {v.model} {v.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.engine} · {v.fuel} · {v.transmission}
                </p>
              </div>
            </div>
          ))}
        </Card>

        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="h-4 w-4 text-primary" /> Privacidade
          </p>
          <p className="text-xs text-muted-foreground">
            Nunca compartilhamos placa, endereço ou localização em tempo real.
          </p>
          <div className="flex gap-2">
            {(["publico", "amigos", "privado"] as const).map((p) => (
              <button
                key={p}
                onClick={() => social.setValue({ ...social.value, privacy: p })}
                className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-medium capitalize ${
                  social.value.privacy === p
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Toggle
            label="Ocultar quilometragem exata"
            active={social.value.hideOdometer}
            onClick={() =>
              social.setValue({ ...social.value, hideOdometer: !social.value.hideOdometer })
            }
          />
        </Card>

        <Card className="divide-y divide-border p-0">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <span className="flex items-center gap-3 text-sm text-foreground">
              <Moon className="h-4 w-4 text-muted-foreground" /> Tema escuro
            </span>
            <span
              className={`h-6 w-11 rounded-full p-0.5 transition-colors ${dark ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-card transition-transform ${dark ? "translate-x-5" : ""}`}
              />
            </span>
          </button>
          <button
            onClick={exportData}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground"
          >
            <Download className="h-4 w-4 text-muted-foreground" /> Exportar dados
          </button>
          <a
            href="mailto:suporte@tanquemais.app"
            className="flex items-center gap-3 px-5 py-4 text-sm text-foreground"
          >
            <LifeBuoy className="h-4 w-4 text-muted-foreground" /> Suporte
          </a>
        </Card>

        <Card className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Em breve: manutenção, IPVA, seguro, troca de óleo e pneus — o Tanque+ vai virar seu hub
            de gestão automotiva.
          </p>
        </Card>

        <div className="flex gap-2">
          <Link
            to="/economia"
            className="flex-1 rounded-3xl border border-border bg-card px-6 py-4 text-center text-sm font-semibold text-foreground"
          >
            Economia
          </Link>
          <Link
            to="/comunidade"
            className="flex-1 rounded-3xl border border-border bg-card px-6 py-4 text-center text-sm font-semibold text-foreground"
          >
            Minhas {posts.value.length} publicações
          </Link>
        </div>
      </div>
    </MobileShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </Card>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`h-6 w-11 rounded-full p-0.5 transition-colors ${active ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-card transition-transform ${active ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
