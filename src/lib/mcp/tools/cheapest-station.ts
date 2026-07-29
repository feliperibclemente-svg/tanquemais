import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { RADAR } from "@/lib/community";

export default defineTool({
  name: "cheapest_station",
  title: "Posto mais barato e economia estimada",
  description:
    "Retorna o posto mais barato do radar público do Tanque+ para o combustível escolhido e estima a economia de um tanque cheio comparado ao posto mais caro.",
  inputSchema: {
    fuel: z.enum(["gasolina", "etanol"]).describe("Combustível desejado."),
    tankSizeLiters: z.number().optional().describe("Tamanho do tanque em litros (padrão 40)."),
    city: z.string().optional().describe("Restringe a busca a uma cidade."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ fuel, tankSizeLiters, city }) => {
    const tank = tankSizeLiters && tankSizeLiters > 0 ? tankSizeLiters : 40;
    const price = (s: (typeof RADAR)[number]) => (fuel === "gasolina" ? s.gasoline : s.ethanol);
    const pool = city
      ? RADAR.filter((s) => s.city.toLowerCase().includes(city.toLowerCase()))
      : RADAR;
    if (pool.length === 0) {
      return {
        content: [{ type: "text", text: "Nenhum posto encontrado para essa cidade." }],
        isError: true,
      };
    }
    const sorted = [...pool].sort((a, b) => price(a) - price(b));
    const cheapest = sorted[0];
    const priciest = sorted[sorted.length - 1];
    const result = {
      combustivel: fuel,
      postoMaisBarato: {
        nome: cheapest.name,
        cidade: cheapest.city,
        preco: price(cheapest),
        distanciaKm: cheapest.distanceKm,
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
