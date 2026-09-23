import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { FlaskConical, MessageSquareHeart, ShieldCheck, Wrench } from "lucide-react";
import { ActionLink, AppCard, AppShell, PageHeader } from "@/components/ds";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/beta")({
  head: () => ({
    meta: [
      { title: "Tanque+ em Beta — o que esperar" },
      {
        name: "description",
        content:
          "O Tanque+ está em beta fechado: veja o que já funciona, o que ainda vai mudar e como enviar feedback.",
      },
      { property: "og:title", content: "Tanque+ em Beta — o que esperar" },
      {
        property: "og:description",
        content: "Funcionalidades em evolução, dados seguros e um canal direto para seu feedback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BetaPage,
});

const items = [
  {
    icon: FlaskConical,
    title: "Funcionalidades em evolução",
    text: "Telas e cálculos podem mudar entre as versões conforme aprendemos com o uso real.",
  },
  {
    icon: Wrench,
    title: "Pode aparecer algum erro",
    text: "Falhas são registradas automaticamente para correção. Se algo travar, nos conte pelo feedback.",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados são seus",
    text: "Veículos, abastecimentos e estatísticas ficam protegidos e visíveis somente para você.",
  },
  {
    icon: MessageSquareHeart,
    title: "Sua opinião define o roteiro",
    text: "Priorizamos o que os participantes do beta mais pedem. Nada de fila anônima.",
  },
];

function BetaPage() {
  useEffect(() => {
    track("beta_notice_viewed");
  }, []);

  return (
    <AppShell fab={false}>
      <PageHeader title="Você está no Beta" subtitle="Versão de testes fechada do Tanque+" />

      <AppCard className="border-primary/25 bg-accent/40 p-4">
        <p className="text-sm text-foreground">
          Obrigado por testar o Tanque+ antes de todo mundo. O app já registra abastecimentos,
          calcula consumo e custo por km e gera análises da TanqueIA — e continua melhorando toda
          semana com o que você nos conta.
        </p>
      </AppCard>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <AppCard key={item.title} className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
              <item.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{item.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{item.text}</span>
            </span>
          </AppCard>
        ))}
      </div>

      <div className="mt-6">
        <ActionLink to="/feedback" size="md">
          Enviar feedback
        </ActionLink>
      </div>
    </AppShell>
  );
}
