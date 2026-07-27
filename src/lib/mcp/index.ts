import { defineMcp } from "@lovable.dev/mcp-js";
import listStations from "./tools/list-stations";
import cheapestStation from "./tools/cheapest-station";
import fuelEconomy from "./tools/fuel-economy";
import gasolineVsEthanol from "./tools/gasoline-vs-ethanol";
import listClubs from "./tools/list-clubs";

export default defineMcp({
  name: "tanque-mais-mcp",
  title: "Tanque+ MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas públicas do Tanque+ para economia de combustível: consultar preços de postos, achar o posto mais barato, comparar gasolina x etanol, calcular consumo/custo de viagem e listar clubes da comunidade. Dados de abastecimento pessoais ficam no aparelho do usuário e não são expostos aqui.",
  tools: [listStations, cheapestStation, gasolineVsEthanol, fuelEconomy, listClubs],
});
