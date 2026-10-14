import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/app/LegalPage";
import { SUPPORT_EMAIL } from "@/constants/app";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Tanque+" },
      {
        name: "description",
        content: "Quais dados o Tanque+ coleta no beta, por quê e como exercer seus direitos.",
      },
      { property: "og:title", content: "Política de Privacidade — Tanque+" },
      {
        property: "og:description",
        content: "Como o Tanque+ trata seus dados durante o beta gratuito.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        O Tanque+ está em beta gratuito. Esta política explica, de forma simples, como tratamos seus
        dados conforme a Lei Geral de Proteção de Dados (LGPD).
      </p>
      <section>
        <h2>Dados que coletamos</h2>
        <ul>
          <li>E-mail e nome da sua conta;</li>
          <li>Veículos cadastrados;</li>
          <li>Abastecimentos (valor, preço, litros, quilometragem, data);</li>
          <li>Faixa etária e gênero, apenas se você informar (opcionais);</li>
          <li>Mensagens de feedback que você enviar;</li>
          <li>Eventos de uso do app (telas abertas e ações), sem e-mail ou nome.</li>
        </ul>
      </section>
      <section>
        <h2>Para que usamos</h2>
        <p>
          Para calcular seu consumo e gastos, manter seu histórico, melhorar o app e entender, de
          forma agregada, quem usa o beta.
        </p>
      </section>
      <section>
        <h2>Não vendemos seus dados</h2>
        <p>
          Seus dados não são vendidos nem compartilhados com anunciantes. Outros usuários não veem
          seus abastecimentos.
        </p>
      </section>
      <section>
        <h2>Base legal</h2>
        <p>
          Execução do serviço que você pediu ao criar a conta, seu consentimento para os dados
          opcionais e nosso legítimo interesse em melhorar o app.
        </p>
      </section>
      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode acessar, corrigir, baixar e excluir seus dados a qualquer momento. No Perfil, em
          "Seus dados", há os botões "Baixar meus dados" e "Excluir minha conta".
        </p>
      </section>
      <section>
        <h2>Contato</h2>
        <p>
          Dúvidas ou pedidos:{" "}
          <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . Respondemos em até 15 dias.
        </p>
      </section>
    </LegalPage>
  );
}
