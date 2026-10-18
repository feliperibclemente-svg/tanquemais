import { SITE_URL } from "@/constants/app";

/**
 * E-mail de boas-vindas (enviado uma vez, ao terminar o cadastro inicial).
 * Curto, na voz do Teo, só com o que faz o app funcionar. Sem propaganda.
 */

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Primeiro nome limpo e curto; sem nome, a saudação fica genérica. */
function cleanName(name: string | null | undefined): string {
  return (
    (name ?? "")
      .replace(/[\r\n\t]/g, " ")
      .trim()
      .split(/\s+/)[0]
      ?.slice(0, 40) ?? ""
  );
}

const STEPS = [
  ["Registre no posto", "Valor, preço do litro e km do painel. Leva uns 20 segundos."],
  [
    "Encha o tanque até a bomba desligar",
    "Com dois tanques cheios seguidos, eu calculo quantos km por litro você faz de verdade.",
  ],
  [
    "Coloque o Tanque+ na tela inicial",
    "Ele abre como app e você continua conectado. O passo a passo está no Perfil.",
  ],
] as const;

export function welcomeEmail(firstName: string | null | undefined) {
  const name = cleanName(firstName);
  const subject = name ? `Boas-vindas ao Tanque+, ${name}!` : "Boas-vindas ao Tanque+!";
  const url = `${SITE_URL}/app?source=email_boas_vindas`;
  const hello = name ? `Oi, ${escapeHtml(name)}!` : "Oi!";

  const steps = STEPS.map(
    ([title, body], i) => `
        <tr><td style="padding-bottom:16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" style="width:32px;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:999px;background:#e3f4ec;color:#178559;font-weight:bold;font-size:13px;">${i + 1}</span></td>
            <td style="font-size:15px;line-height:1.5;color:#3d4458;"><strong style="color:#141a2c;">${title}</strong><br>${body}</td>
          </tr></table>
        </td></tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#141a2c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px 28px;">
        <tr><td style="padding-bottom:24px;"><img src="https://www.tanquemais.com.br/email/logo.png" width="160" height="43" alt="Tanque+" style="display:block;border:0;width:160px;height:auto;font-size:22px;font-weight:bold;color:#178559;"></td></tr>
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px;">${hello}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#3d4458;padding-bottom:20px;">Aqui é o Teo, do Tanque+. Que bom ter você no beta. Para eu te mostrar seus números de verdade, três hábitos fazem toda a diferença:</td></tr>${steps}
        <tr><td style="padding:8px 0 24px;">
          <a href="${url}" style="display:inline-block;background:#178559;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 24px;border-radius:999px;">Abrir o Tanque+</a>
        </td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#3d4458;">Achou algo estranho ou teve uma ideia? É só responder este e-mail. Toda mensagem é lida.</td></tr>
      </table>
      <p style="font-size:12px;line-height:1.5;color:#9ca3af;margin-top:16px;max-width:480px;">Você recebeu este e-mail porque criou uma conta no Tanque+. Não enviamos propaganda.<br>Tanque+ · tanquemais.com.br · <a href="${SITE_URL}/privacidade" style="color:#9ca3af;">Privacidade</a></p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    name ? `Oi, ${name}!` : "Oi!",
    "",
    "Aqui é o Teo, do Tanque+. Que bom ter você no beta. Para eu te mostrar seus números de verdade, três hábitos fazem toda a diferença:",
    "",
    ...STEPS.map(([title, body], i) => `${i + 1}. ${title}: ${body}`),
    "",
    `Abrir o Tanque+: ${url}`,
    "",
    "Achou algo estranho ou teve uma ideia? É só responder este e-mail. Toda mensagem é lida.",
    "",
    "Você recebeu este e-mail porque criou uma conta no Tanque+. Não enviamos propaganda.",
  ].join("\n");

  return { subject, html, text };
}
