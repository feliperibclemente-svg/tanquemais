import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "fuel_economy",
  title: "Calcular consumo e custo de viagem",
  description:
    "Calcula km/l, custo por km e custo total de um trajeto a partir da distância, do rendimento do veículo e do preço do litro.",
  inputSchema: {
    distanceKm: z.number().describe("Distância percorrida ou planejada, em km."),
    kmPerLiter: z.number().describe("Rendimento do veículo em km/l."),
    pricePerLiter: z.number().describe("Preço do litro em reais."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ distanceKm, kmPerLiter, pricePerLiter }) => {
    if (distanceKm <= 0 || kmPerLiter <= 0 || pricePerLiter <= 0) {
      return { content: [{ type: "text", text: "Todos os valores devem ser maiores que zero." }], isError: true };
    }
    const litros = distanceKm / kmPerLiter;
    const result = {
      litrosNecessarios: Number(litros.toFixed(2)),
      custoTotal: Number((litros * pricePerLiter).toFixed(2)),
      custoPorKm: Number((pricePerLiter / kmPerLiter).toFixed(3)),
      rendimentoKmL: kmPerLiter,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
