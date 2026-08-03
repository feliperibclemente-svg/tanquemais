import { defineTool } from "@lovable.dev/mcp-js";
import { emptyResult, mcpSupabase } from "../supabase.server";

export default defineTool({
  name: "list_clubs",
  title: "Listar clubes da comunidade",
  description:
    "Lista os clubes públicos da comunidade Tanque+ (por marca, cidade e perfil de uso) com número de membros.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { data, error } = await mcpSupabase()
      .from("clubs")
      .select("id, slug, name, description, kind, city, members_count")
      .order("members_count", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return emptyResult("Ainda não há clubes criados na comunidade Tanque+.");
    }

    const rows = data.map((c) => ({
      id: c.id,
      slug: c.slug,
      nome: c.name,
      tipo: c.kind,
      membros: c.members_count,
      cidade: c.city,
      descricao: c.description,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { clubes: rows },
    };
  },
});
