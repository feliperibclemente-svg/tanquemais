import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { emptyResult, fetchStations } from "../supabase.server";

export default defineTool({
  name: "cheapest_station",
  title: "Posto mais barato e economia estimada",
  description:
    "Retorna o posto mais barato cadastrado no Tanque+ para o combustível escolhido e estima a economia de um tanque cheio comparado ao posto mais caro.",
  inputSchema: {
    fuel: z.string().describe("Combustível desejado (gasolina, etanol, diesel, gnv...)."),
    tankSizeLiters: z.number().optional().describe("Tamanho do tanque em litros (padrão 40)."),
    city: z.string().optional().describe("Restringe a busca a uma cidade."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ fuel, tankSizeLiters, city }) => {
    const tank = tankSizeLiters && tankSizeLiters > 0 ? tankSizeLiters : 40;
    const pool = (await fetchStations(city)).filter((s) => s.prices[fuel]);
    if (pool.length === 0) {
      return emptyResult(`Ainda não há preços de "${fuel}" informados para essa região.`);
    }

    const price = (s: (typeof pool)[number]) => s.prices[fuel]!.price;
    const sorted = [...pool].sort((a, b) => price(a) - price(b));
    const cheapest = sorted[0];
    const priciest = sorted[sorted.length - 1];

    const result = {
      combustivel: fuel,
      postoMaisBarato: {
        nome: cheapest.name,
        cidade: cheapest.city,
        preco: price(cheapest),
        confiabilidade: cheapest.reliability_score,
      },
      postoMaisCaro: { nome: priciest.name, preco: price(priciest) },
      economiaTanqueCheio: Number(((price(priciest) - price(cheapest)) * tank).toFixed(2)),
      tanqueLitros: tank,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
