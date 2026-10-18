import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Tabelas com dados do usuário e a coluna que aponta para ele (ordem respeita FKs). */
const USER_TABLES: Array<[string, string]> = [
  ["events", "user_id"],
  ["app_errors", "user_id"],
  ["ai_insights", "user_id"],
  ["notifications", "user_id"],
  ["mission_progress", "user_id"],
  ["user_badges", "user_id"],
  ["likes", "user_id"],
  ["comments", "user_id"],
  ["posts", "user_id"],
  ["club_members", "user_id"],
  ["followers", "follower_id"],
  ["followers", "following_id"],
  ["favorites", "user_id"],
  ["station_reviews", "user_id"],
  ["station_photos", "user_id"],
  ["feedback", "user_id"],
  ["fuelings", "user_id"],
  ["vehicle_statistics", "user_id"],
  ["vehicles", "user_id"],
  ["user_statistics", "user_id"],
  ["user_roles", "user_id"],
  ["profiles", "id"],
];

/** Exclui a conta do usuário autenticado e todos os seus dados. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Preços informados ficam, mas sem vínculo com a pessoa.
    await supabaseAdmin
      .from("station_prices")
      .update({ reported_by: null })
      .eq("reported_by", userId);
    await supabaseAdmin
      .from("price_history")
      .update({ reported_by: null })
      .eq("reported_by", userId);
    await supabaseAdmin.from("stations").update({ created_by: null }).eq("created_by", userId);
    await supabaseAdmin.from("clubs").update({ created_by: null }).eq("created_by", userId);
    for (const [table, column] of USER_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from(table as any) as any).delete().eq(column, userId);
      if (error && !/does not exist|schema cache/i.test(error.message)) {
        console.error("account.delete", table, error.message);
        throw new Error("Não conseguimos excluir sua conta agora. Tente novamente.");
      }
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("account.delete.auth", error.message);
      throw new Error("Não conseguimos excluir sua conta agora. Tente novamente.");
    }
    return { ok: true };
  });
