import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStations from "./tools/list-stations";
import cheapestStation from "./tools/cheapest-station";
import fuelEconomy from "./tools/fuel-economy";
import gasolineVsEthanol from "./tools/gasoline-vs-ethanol";
import listClubs from "./tools/list-clubs";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tanque-mais-mcp",
  title: "Tanque+ MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do Tanque+ para economia de combustível: consultar preços de postos, achar o posto mais barato, comparar gasolina x etanol, calcular consumo/custo de viagem e listar clubes da comunidade. Requer login na conta Tanque+.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listStations, cheapestStation, gasolineVsEthanol, fuelEconomy, listClubs],
});
