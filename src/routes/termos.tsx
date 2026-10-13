import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/app/LegalPage";
import { SUPPORT_EMAIL } from "@/constants/app";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Tanque+" },
      { name: "description", content: "Regras de uso do Tanque+ durante o beta gratuito." },
      { property: "og:title", content: "Termos de Uso — Tanque+" },
      { property: "og:description", content: "Condições para usar o beta gratuito do Tanque+." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <LegalPage title="Termos de Uso">
      <section>
        <h2>O que é o Tanque+</h2>
        <p>Um app gratuito, em versão beta, para registrar abastecimentos e acompanhar consumo e gastos.</p>
      </section>
      <section>
        <h2>Versão de testes</h2>
        <p>
          Por ser beta, o app pode ter falhas, mudar ou ficar fora do ar. Os cálculos são estimativas
          feitas com os dados que você informa; confira antes de tomar decisões importantes.
        </p>
      </section>
      <section>
        <h2>Sua conta</h2>
        <p>Você é responsável pelos dados que registra e por manter seu acesso seguro. Não use o app para fins ilegais.</p>
      </section>
      <section>
        <h2>Seus dados</h2>
        <p>
          O tratamento dos seus dados segue a nossa <a className="font-semibold text-primary" href="/privacidade">Política de Privacidade</a>.
          Você pode excluir sua conta a qualquer momento pelo Perfil.
        </p>
      </section>
      <section>
        <h2>Contato</h2>
        <p>
          <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
