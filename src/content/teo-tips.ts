import { brandLabel, vehicleKind } from "@/constants/vehicles";

/**
 * Conteúdo editorial do Teo para quando ainda não há números da pessoa para comentar.
 * Escrito e revisado por nós (não gerado por IA): só fatos verificáveis sobre as marcas e
 * dicas de uso consagradas. Sem promessas de economia em valores, sem opinião sobre marcas.
 * Para incluir/alterar: mantenha frases curtas e de conhecimento público.
 */

export const BRAND_FACTS: Record<string, readonly string[]> = {
  Fiat: [
    "Fiat é a sigla de Fabbrica Italiana Automobili Torino. A marca nasceu em Turim, na Itália, em 1899.",
    "A fábrica da Fiat em Betim (MG) foi inaugurada em 1976.",
    "Em 1979, o Fiat 147 a álcool foi o primeiro carro movido a etanol produzido em série no Brasil.",
  ],
  Volkswagen: [
    "Volkswagen quer dizer “carro do povo”, em alemão.",
    "O Gol Total Flex, de 2003, foi o primeiro carro flex vendido no Brasil.",
    "O Fusca foi fabricado no Brasil de 1959 a 1986 e voltou à linha entre 1993 e 1996.",
  ],
  Chevrolet: [
    "A Chevrolet foi fundada em 1911, nos Estados Unidos, por Louis Chevrolet e William Durant.",
    "A General Motors chegou ao Brasil em 1925, montando carros em São Paulo.",
  ],
  Ford: [
    "A Ford foi fundada por Henry Ford em 1903, em Detroit, nos Estados Unidos.",
    "O Ford Modelo T, lançado em 1908, popularizou a produção de carros em linha de montagem.",
    "A Ford está no Brasil desde 1919.",
  ],
  Toyota: [
    "Antes dos carros, a família Toyoda fabricava teares, as máquinas de tecer.",
    "O Corolla é um dos carros mais vendidos da história no mundo.",
    "Em 2019, a Toyota lançou no Brasil o primeiro carro híbrido flex do mundo: o Corolla.",
  ],
  Hyundai: [
    "A Hyundai Motor Company foi fundada na Coreia do Sul em 1967.",
    "O HB20 foi desenvolvido para o mercado brasileiro e é fabricado em Piracicaba (SP).",
  ],
  Honda: [
    "A Honda foi fundada no Japão em 1948 e começou pelas motos antes dos carros.",
    "Além de carros e motos, a Honda faz motores para barcos, geradores e até cortadores de grama.",
  ],
  "Honda Motos": [
    "A Honda fabrica motos em Manaus (AM) desde 1976.",
    "A CG, lançada no Brasil em 1976, está entre as motos mais vendidas da história do país.",
  ],
  Yamaha: [
    "A Yamaha começou fazendo pianos, em 1887. Os três diapasões do logotipo vêm dessa origem musical.",
    "A Yamaha fabrica motos no Brasil, em Manaus (AM).",
  ],
  Renault: [
    "A Renault foi fundada em 1899, na França, pelos irmãos Louis, Marcel e Fernand Renault.",
    "A fábrica da Renault no Brasil fica em São José dos Pinhais (PR).",
  ],
  Peugeot: [
    "Antes dos carros, a família Peugeot fabricava ferramentas, moedores de pimenta e bicicletas.",
    "O leão é o símbolo da Peugeot desde o século 19.",
  ],
  Citroën: [
    "Os dois “V” invertidos do símbolo da Citroën lembram engrenagens, o primeiro produto de André Citroën.",
    "O Citroën Traction Avant, de 1934, foi pioneiro entre os carros de tração dianteira feitos em série.",
  ],
  Jeep: [
    "O Jeep nasceu como veículo militar na Segunda Guerra Mundial: o Willys MB, de 1941.",
    "A fábrica da Jeep em Goiana (PE) produz modelos como Renegade e Compass.",
  ],
  Nissan: [
    "A fábrica da Nissan no Brasil fica em Resende (RJ).",
    "O Nissan Leaf, de 2010, foi um dos primeiros carros 100% elétricos produzidos em grande escala.",
  ],
  Mitsubishi: [
    "Os três diamantes do logotipo da Mitsubishi vêm dos brasões das famílias fundadoras.",
    "No Brasil, os carros da Mitsubishi são fabricados em Catalão (GO).",
  ],
  Kia: [
    "A Kia é a montadora mais antiga da Coreia do Sul: começou em 1944 fazendo peças de bicicleta.",
  ],
  "Mercedes-Benz": [
    "Karl Benz criou, em 1886, o veículo considerado o primeiro automóvel com motor a combustão.",
    "O nome Mercedes veio da filha de Emil Jellinek, um dos primeiros grandes revendedores da marca.",
  ],
  BMW: [
    "BMW é a sigla de Bayerische Motoren Werke, “Fábrica de Motores da Baviera”. A empresa começou fazendo motores de avião.",
    "A BMW tem fábrica no Brasil, em Araquari (SC).",
  ],
  Audi: [
    "As quatro argolas da Audi representam as marcas que se uniram em 1932: Audi, DKW, Horch e Wanderer.",
    "“Audi” é “ouça” em latim, a tradução de Horch, sobrenome do fundador August Horch.",
  ],
  BYD: [
    "A BYD começou em 1995 fabricando baterias, antes de produzir carros.",
    "BYD é a sigla de “Build Your Dreams”: construa seus sonhos, em inglês.",
  ],
  "Caoa Chery": [
    "A Chery é uma montadora chinesa fundada em 1997.",
    "A Caoa Chery fabrica carros no Brasil, em Anápolis (GO).",
  ],
  "Suzuki Motos": [
    "A Suzuki começou em 1909, no Japão, fabricando teares. As motos vieram depois, nos anos 1950.",
  ],
  Kawasaki: [
    "A Kawasaki não faz só motos: o mesmo grupo fabrica trens-bala, navios e peças de avião.",
  ],
  "Royal Enfield": [
    "A Royal Enfield nasceu na Inglaterra e hoje é indiana. O modelo Bullet é fabricado desde 1932.",
  ],
  "BMW Motorrad": ["A primeira moto da BMW, a R 32, foi lançada em 1923."],
  Triumph: ["A Triumph é inglesa, de Coventry, e fez sua primeira moto em 1902."],
  "Harley-Davidson": [
    "A Harley-Davidson foi fundada em 1903, em Milwaukee, nos Estados Unidos, por William Harley e os irmãos Davidson.",
  ],
  Dafra: ["A Dafra é uma marca brasileira de motos, com fábrica em Manaus (AM)."],
  Haojue: [
    "A Haojue é uma fabricante chinesa de motos. As vendidas no Brasil são montadas em Manaus (AM).",
  ],
  Shineray: ["A Shineray é uma marca chinesa com fábrica no Brasil, em Pernambuco."],
  Mottu: [
    "A Mottu é uma empresa brasileira que aluga motos para quem trabalha com entregas e tem o próprio modelo, a Mottu Sport.",
  ],
  RAM: [
    "A RAM nasceu como a linha de picapes da Dodge e virou uma marca separada em 2010.",
    "A RAM Rampage é fabricada no Brasil, em Goiana (PE).",
  ],
};

type TipFor = "carro" | "moto" | "todos";

export const DRIVING_TIPS: readonly { text: string; for: TipFor }[] = [
  {
    for: "carro",
    text: "Calibre os pneus a cada 15 dias, com eles frios, na pressão do manual ou da etiqueta do veículo. Pneu murcho aumenta o consumo e o desgaste.",
  },
  {
    for: "todos",
    text: "Acelere e freie com suavidade. Arrancadas fortes estão entre o que mais gasta combustível na cidade.",
  },
  {
    for: "todos",
    text: "Na estrada, velocidade constante gasta menos. Quanto mais rápido, mais a resistência do ar pesa no consumo.",
  },
  {
    for: "carro",
    text: "Peso extra também gasta. Vale tirar do porta-malas o que não precisa estar ali.",
  },
  {
    for: "todos",
    text: "Com câmbio manual, troque de marcha sem esticar demais o giro. Motor em rotação alta gasta mais.",
  },
  {
    for: "todos",
    text: "Ao abastecer, pare no primeiro desarme da bomba. Completar além disso não cabe no tanque com segurança.",
  },
  {
    for: "todos",
    text: "Revisões em dia, com filtro de ar, velas e óleo na época certa, ajudam o motor a gastar só o necessário.",
  },
  {
    for: "todos",
    text: "Juntar vários compromissos num trajeto só costuma gastar menos do que várias saídas curtas com o motor frio.",
  },
  {
    for: "todos",
    text: "Se o seu motor é flex, o etanol costuma compensar quando custa até cerca de 70% da gasolina. No Painel, eu faço essa conta com os preços do dia.",
  },
  {
    for: "moto",
    text: "Não precisa deixar a moto esquentando parada por muito tempo: alguns segundos bastam. Depois, saia rodando devagar até o motor aquecer.",
  },
  {
    for: "moto",
    text: "Calibre os pneus da moto a cada 15 dias, frios, na pressão do manual (ela muda com garupa ou carga). Pneu murcho gasta mais e tira estabilidade.",
  },
  {
    for: "moto",
    text: "Corrente limpa, lubrificada e com a folga certa ajuda a moto a gastar menos e dura mais.",
  },
];

function kindOf(brand: string | null | undefined): "carro" | "moto" {
  return vehicleKind(brand) ?? "carro";
}

export function tipsFor(brand: string | null | undefined): string[] {
  const kind = kindOf(brand);
  return DRIVING_TIPS.filter((t) => t.for === "todos" || t.for === kind).map((t) => t.text);
}

export interface TeoNote {
  kind: "curiosidade" | "dica";
  title: string;
  text: string;
}

/**
 * Uma nota por dia (muda à meia-noite, igual para a mesma pessoa durante o dia):
 * alterna curiosidade da marca e dica de uso. Sem marca conhecida, só dicas.
 */
export function teoNoteOfTheDay(brand: string | null | undefined, date = new Date()): TeoNote {
  const day = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 1)) /
      86_400_000,
  );
  const facts = (brand && BRAND_FACTS[brand]) || [];
  const tips = tipsFor(brand);
  const index = Math.abs(day);
  if (facts.length && index % 2 === 0) {
    return {
      kind: "curiosidade",
      title: `Curiosidade sobre a ${brandLabel(brand)}`,
      text: facts[Math.floor(index / 2) % facts.length],
    };
  }
  return { kind: "dica", title: "Dica do Teo", text: tips[index % tips.length] };
}
