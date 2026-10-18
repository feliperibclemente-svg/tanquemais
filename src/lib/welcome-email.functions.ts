import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUPPORT_EMAIL } from "@/constants/app";
import { welcomeEmail } from "@/lib/welcome-email";

const FROM = "Tanque+ <nao-responda@tanquemais.com.br>";

/**
 * Envia o e-mail de boas-vindas uma única vez por pessoa (Resend, chave RESEND_API_KEY).
 * A linha em welcome_emails é gravada antes do envio (trava contra envio duplo); se o envio
 * falhar, a linha é apagada para tentar de novo numa próxima vez.
 */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { sent: false, reason: "not_configured" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("welcome_emails")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true })
      .select("user_id");
    if (claimError || !claimed?.length) return { sent: false, reason: "already_sent" as const };

    const release = () => supabaseAdmin.from("welcome_emails").delete().eq("user_id", userId);

    const [{ data: auth }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from("profiles").select("first_name").eq("id", userId).maybeSingle(),
    ]);
    const email = auth?.user?.email;
    if (!email) {
      await release();
      return { sent: false, reason: "no_email" as const };
    }

    const { subject, html, text } = welcomeEmail(profile?.first_name);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          reply_to: SUPPORT_EMAIL,
          subject,
          html,
          text,
        }),
      });
      if (!res.ok) {
        console.error(
          "[boas-vindas] Resend respondeu",
          res.status,
          (await res.text()).slice(0, 200),
        );
        await release();
        return { sent: false, reason: "send_failed" as const };
      }
    } catch (error) {
      console.error("[boas-vindas] falha ao enviar", error);
      await release();
      return { sent: false, reason: "send_failed" as const };
    }
    return { sent: true as const };
  });
