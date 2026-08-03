import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ETHANOL_BREAKEVEN_RATIO } from "@/constants/app";
import { emptyResult, fetchStations } from "../supabase.server";

export default defineTool({
  name: "gasoline_vs_ethanol",
  title: "Gasolina ou etanol?",
  description:
    "Compara gasolina e etanol pela regra dos 70%. Sem preços informados, usa a média dos preços cadastrados pela comunidade Tanque+.",
  inputSchema: {
    gasolinePrice: z.number().optional().describe("Preço da gasolina por litro."),
    ethanolPrice: z.number().optional().describe("Preço do etanol por litro."),
    city: z.string().optional().describe("Cidade usada para calcular a média da comunidade."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ gasolinePrice, ethanolPrice, city }) => {
    let gas = gasolinePrice;
    let eth = ethanolPrice;

    if (gas === undefined || eth === undefined) {
      const stations = await fetchStations(city);
      const avg = (fuel: string) => {
        const values = stations.map((s) => s.prices[fuel]?.price).filter((v): v is number => !!v);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
      };
      gas = gas ?? avg("gasolina");
      eth = eth ?? avg("etanol");
    }

    if (gas === undefined || eth === undefined) {
      return emptyResult(
        "Ainda não há preços suficientes na comunidade. Informe gasolinePrice e ethanolPrice.",
      );
    }

    const ratio = eth / gas;
    const result = {
      gasolina: Number(gas.toFixed(2)),
      etanol: Number(eth.toFixed(2)),
      relacaoPercentual: Number((ratio * 100).toFixed(1)),
      recomendacao: ratio <= ETHANOL_BREAKEVEN_RATIO ? "Etanol compensa" : "Gasolina compensa",
      fonte:
        gasolinePrice && ethanolPrice
          ? "preços informados"
          : "média dos preços cadastrados no Tanque+",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
