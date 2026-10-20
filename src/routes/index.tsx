import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarDays, Gauge, MapPinned, ShieldCheck, Wrench } from "lucide-react";
import { ActionLink } from "@/components/ds";
import { useAuth } from "@/providers/AuthProvider";
import { PRIVACY_URL, TERMS_URL } from "@/constants/app";
import { Logo } from "@/components/app/Logo";

/**
 * Página de entrada: quem chega por um link compartilhado decide em segundos.
 * Uma frase, um exemplo do app de verdade, o que ele faz e um botão.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tanque+ — quanto seu carro ou moto gasta de verdade" },
      {
        name: "description",
        content:
          "Grátis. Registre o abastecimento em 20 segundos e veja o consumo real, o custo por km e se você pagou acima ou abaixo da média da sua cidade (ANP).",
      },
      { property: "og:title", content: "Tanque+ — quanto seu carro ou moto gasta de verdade" },
      {
        property: "og:description",
        content: "Consumo real, média de preço da sua cidade e a retrospectiva do seu mês. Grátis.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Gauge,
    title: "Consumo real",
    body: "Quantos km/L você faz de verdade, não o do manual.",
  },
  { icon: MapPinned, title: "Média da cidade", body: "Seu preço comparado com a pesquisa da ANP." },
  {
    icon: CalendarDays,
    title: "Seu mês",
    body: "Retrospectiva com seus números, pronta para compartilhar.",
  },
  { icon: Wrench, title: "Check-up", body: "O que pedir para conferir na oficina." },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-8">
      <header className="flex items-center justify-between">
        <Logo className="h-8" />
        <Link
          to="/auth"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          Entrar
        </Link>
      </header>

      <h1 className="mt-8 text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-foreground">
        Saiba quanto seu carro ou moto gasta de verdade.
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Registre o abastecimento em 20 segundos. O resto, o Tanque+ calcula.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Destaques">
        {["Grátis", "Sem anúncios", "Sem baixar nada da loja"].map((t) => (
          <li key={t} className="rounded-full bg-accent px-3 py-1.5 text-primary">
            {t}
          </li>
        ))}
      </ul>

      {/* Exemplo do que a pessoa vê depois de abastecer */}
      <figure className="mt-6 rounded-[2rem] border border-border bg-card p-4">
        <figcaption className="text-xs font-medium text-muted-foreground">
          Exemplo de tela
        </figcaption>
        <div className="mt-3 rounded-2xl border border-primary/30 bg-accent/50 p-3">
          <p className="text-sm font-semibold text-primary">
            R$ 0,11/L abaixo da média de Campinas
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Fonte: ANP, média da semana</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
            <p className="text-[11px] font-semibold">Consumo real</p>
            <p className="text-2xl font-extrabold leading-tight">12,4 km/L</p>
          </div>
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
            <p className="text-[11px] font-semibold text-white/80">Gasto no mês</p>
            <p className="text-2xl font-extrabold leading-tight">R$ 642</p>
          </div>
        </div>
      </figure>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {features.map((f) => (
          <li key={f.title} className="rounded-3xl border border-border bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
              <f.icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="mt-2 block text-sm font-semibold text-foreground">{f.title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {f.body}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        <ActionLink to="/auth" size="lg">
          Começar grátis
        </ActionLink>
        <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
          Seus abastecimentos são só seus. Não vendemos seus dados.
        </p>
      </div>

      <footer className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Funciona com carro e moto ·{" "}
        <a href={PRIVACY_URL} className="underline">
          Privacidade
        </a>
        {" · "}
        <a href={TERMS_URL} className="underline">
          Termos
        </a>
      </footer>
    </div>
  );
}
