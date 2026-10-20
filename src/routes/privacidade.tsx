import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/app/LegalPage";
import { CONTROLLER_NAME, SUPPORT_EMAIL } from "@/constants/app";

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
        <h2>Quem é o responsável</h2>
        <p>
          O responsável pelo tratamento dos seus dados (controlador) é {CONTROLLER_NAME}, pessoa
          física, desenvolvedor do Tanque+. Contato do encarregado:{" "}
          <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
      <section>
        <h2>Dados que coletamos</h2>
        <ul>
          <li>
            E-mail da conta (usado para login e para um único e-mail de boas-vindas com dicas de
            uso; não fica público e não recebe propaganda);
          </li>
          <li>Nome e sobrenome;</li>
          <li>
            Data de nascimento, para confirmar que você tem 18 anos ou mais e calcular sua faixa
            etária (não fica pública);
          </li>
          <li>Veículos cadastrados;</li>
          <li>
            Abastecimentos (valor, preço, litros, quilometragem, data e, se você informar, o nome do
            posto);
          </li>
          <li>
            Dicas que você enviar à comunidade (tema e texto) e denúncias que fizer (motivo). As
            dicas aparecem para outros usuários sem nome nem qualquer dado seu; ninguém vê quem
            publicou ou quem denunciou;
          </li>
          <li>
            Respostas do check-up do veículo e km da troca de óleo, se você fizer o check-up (para
            mostrar o resultado e lembrar da próxima troca);
          </li>
          <li>Foto de perfil, cidade e estado, apenas se você informar (opcionais);</li>
          <li>Faixa etária e gênero, apenas se você informar (opcionais);</li>
          <li>Mensagens de feedback que você enviar;</li>
          <li>Eventos de uso do app (telas abertas e ações), sem e-mail ou nome.</li>
          <li>
            Registros técnicos de erro (tela, mensagem do erro e navegador), sem e-mail ou nome,
            guardados por até 90 dias para corrigir falhas.
          </li>
        </ul>
      </section>
      <section>
        <h2>Para que usamos</h2>
        <p>
          Para calcular seu consumo e gastos, manter seu histórico, melhorar o app e entender, de
          forma agregada, quem usa o beta. Se você informar cidade e estado, usamos esses dados para
          comparar seus preços com médias públicas da ANP; a consulta é feita no nosso próprio
          banco, sem enviar seus dados à ANP ou a terceiros.
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
        <h2>Com quem compartilhamos</h2>
        <p>
          Só com os serviços necessários para o app funcionar, que tratam os dados em nosso nome:
        </p>
        <ul>
          <li>Vercel: hospedagem do app;</li>
          <li>Supabase: banco de dados e login (servidores nos Estados Unidos);</li>
          <li>
            Resend: envio dos e-mails de confirmação de cadastro, troca de senha e boas-vindas;
          </li>
          <li>Google: apenas se você escolher entrar com a conta Google;</li>
          <li>
            Google Gemini: recebe os números já calculados dos seus abastecimentos e a marca e o
            modelo do veículo (sem e-mail ou nome) para escrever as frases da TanqueIA.
          </li>
          <li>
            Google Gemini também recebe o texto das dicas enviadas à comunidade (sem nome, e-mail ou
            qualquer dado da conta), só para barrar automaticamente conteúdo ofensivo antes da
            revisão humana;
          </li>
        </ul>
      </section>
      <section>
        <h2>Transferência internacional</h2>
        <p>
          Esses serviços podem armazenar ou processar dados em servidores fora do Brasil, com
          medidas de segurança compatíveis com a LGPD.
        </p>
      </section>
      <section>
        <h2>Por quanto tempo guardamos</h2>
        <p>
          Enquanto sua conta existir. Ao excluir a conta pelo Perfil, apagamos seus dados, inclusive
          os eventos de uso; preços de postos que você tenha informado continuam no app, sem vínculo
          com você.
        </p>
      </section>
      <section>
        <h2>Segurança</h2>
        <p>
          O acesso é protegido por login e cada usuário só consegue ler os próprios dados. Ainda
          assim, nenhum sistema é 100% imune; se houver um incidente relevante, avisaremos você.
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
