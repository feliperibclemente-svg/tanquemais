import { defineTool } from "@lovable.dev/mcp-js";
import { CLUBS } from "@/lib/community";

export default defineTool({
  name: "list_clubs",
  title: "Listar clubes da comunidade",
  description: "Lista os clubes públicos da comunidade Tanque+ (por marca, cidade e perfil de uso) com número de membros.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = CLUBS.map((c) => ({
      id: c.id,
      nome: c.name,
      membros: c.members,
      cidade: c.city ?? null,
      descricao: c.description,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { clubes: rows },
    };
  },
});
