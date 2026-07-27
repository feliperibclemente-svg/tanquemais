import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { RADAR } from "@/lib/community";

export default defineTool({
  name: "gasoline_vs_ethanol",
  title: "Gasolina ou etanol?",
  description:
    "Compara gasolina e etanol pela regra dos 70%. Sem preços informados, usa a média pública dos postos do radar do Tanque+.",
  inputSchema: {
    gasolinePrice: z.number().optional().describe("Preço da gasolina por litro."),
    ethanolPrice: z.number().optional().describe("Preço do etanol por litro."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ gasolinePrice, ethanolPrice }) => {
    const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
    const gas = gasolinePrice ?? avg(RADAR.map((s) => s.gasoline));
    const eth = ethanolPrice ?? avg(RADAR.map((s) => s.ethanol));
    const ratio = eth / gas;
    const result = {
      gasolina: Number(gas.toFixed(2)),
      etanol: Number(eth.toFixed(2)),
      relacaoPercentual: Number((ratio * 100).toFixed(1)),
      recomendacao: ratio <= 0.7 ? "Etanol compensa" : "Gasolina compensa",
      fonte: gasolinePrice && ethanolPrice ? "preços informados" : "média pública dos postos do Tanque+",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
