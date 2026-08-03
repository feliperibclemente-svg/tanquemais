import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { emptyResult, fetchStations } from "../supabase.server";

export default defineTool({
  name: "list_stations",
  title: "Listar postos e preços",
  description:
    "Lista os postos cadastrados no Tanque+ com os preços informados pela comunidade, cidade, avaliação e índice de confiabilidade.",
  inputSchema: {
    city: z.string().optional().describe("Filtra pela cidade, ex: Goiânia."),
    fuel: z
      .string()
      .optional()
      .describe("Ordena pelo preço deste combustível (gasolina, etanol, diesel, gnv...)."),
    limit: z.number().int().optional().describe("Máximo de postos retornados (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, fuel, limit }) => {
    const stations = await fetchStations(city);
    if (stations.length === 0) {
      return emptyResult("Nenhum posto cadastrado ainda para esses filtros.");
    }

    let rows = stations.map((s) => ({
      id: s.id,
      nome: s.name,
      cidade: s.city,
      avaliacao: s.rating,
      confiabilidade: s.reliability_score,
      abastecimentos: s.fillups_count,
      precos: s.prices,
    }));

    if (fuel) {
      const price = (r: (typeof rows)[number]) => r.precos[fuel]?.price ?? Number.POSITIVE_INFINITY;
      rows = rows.filter((r) => r.precos[fuel]).sort((a, b) => price(a) - price(b));
      if (rows.length === 0) {
        return emptyResult(`Ainda não há preços informados para "${fuel}".`);
      }
    }

    rows = rows.slice(0, Math.max(1, Math.min(limit ?? 20, 50)));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { postos: rows },
    };
  },
});
