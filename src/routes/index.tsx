import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Fuel, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tanque+ — Assistente de economia de combustível" },
      {
        name: "description",
        content:
          "Registre abastecimentos em segundos, veja seu consumo real em km/L e descubra quanto dá para economizar no próximo tanque.",
      },
      { property: "og:title", content: "Tanque+ — Assistente de economia de combustível" },
      {
        property: "og:description",
        content:
          "Consumo real, custo por quilômetro e os postos mais baratos perto de você, em um app só.",
      },
    ],
  }),
  component: Landing,
});

const highlights = [
  { icon: Fuel, title: "Abasteça em 20 segundos", body: "Um campo por vez, litros calculados automaticamente." },
  { icon: BarChart3, title: "Consumo real", body: "km/L, custo por km e comparação mês a mês." },
  { icon: MapPin, title: "Postos mais baratos", body: "Preços da comunidade com índice de confiabilidade." },
  { icon: Sparkles, title: "TanqueIA", body: "Recomendações com base nos seus próprios números." },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-6 py-10">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">Tanque+</span>
        </div>

        <h1 className="mt-10 text-4xl font-extrabold leading-tight tracking-tight text-foreground">
          Gaste menos
          <br />
          em cada tanque.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          O assistente inteligente que mostra quanto seu carro consome, quanto você gasta e onde dá
          para economizar.
        </p>

        <ul className="mt-8 space-y-3">
          {highlights.map((h) => (
            <li
              key={h.title}
              className="flex items-start gap-3 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <h.icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{h.title}</span>
                <span className="block text-sm text-muted-foreground">{h.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 space-y-3">
        <Link
          to="/auth"
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          Começar agora
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          Grátis. Seus dados ficam só na sua conta.
        </p>
      </div>
    </div>
  );
}
