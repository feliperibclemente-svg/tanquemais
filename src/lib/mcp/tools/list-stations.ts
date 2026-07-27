import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { RADAR } from "@/lib/community";

export default defineTool({
  name: "list_stations",
  title: "Listar postos e preços",
  description:
    "Lista os postos monitorados pelo Tanque+ com preços públicos de gasolina e etanol, cidade, distância, avaliação, movimento e tendência de preço.",
  inputSchema: {
    city: z.string().optional().describe("Filtra pela cidade, ex: Goiânia."),
    fuel: z
      .enum(["gasolina", "etanol"])
      .optional()
      .describe("Ordena pelo preço deste combustível (menor primeiro)."),
    limit: z.number().int().optional().describe("Máximo de postos retornados (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ city, fuel, limit }) => {
    let rows = RADAR.map((s) => ({
      id: s.id,
      nome: s.name,
      cidade: s.city,
      gasolina: s.gasoline,
      etanol: s.ethanol,
      distanciaKm: s.distanceKm,
      avaliacao: s.rating,
      movimento: s.busy,
      tendencia: s.trend,
      confirmacoes: s.confirmations,
      atualizadoEm: s.updatedAt,
    }));
    if (city) {
      const q = city.toLowerCase();
      rows = rows.filter((r) => r.cidade.toLowerCase().includes(q));
    }
    if (fuel) {
      rows.sort((a, b) => (fuel === "gasolina" ? a.gasolina - b.gasolina : a.etanol - b.etanol));
    }
    rows = rows.slice(0, Math.max(1, Math.min(limit ?? 20, 50)));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { postos: rows },
    };
  },
});
