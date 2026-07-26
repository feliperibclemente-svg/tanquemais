import { usePersisted } from "./tanque";

/* =========================================================================
 * Tanque+ — Comunidade
 * Dados sociais (feed, clubes, ranking, gamificação). Hoje com base local +
 * conteúdo semente da comunidade; a mesma API pode ser servida pelo Cloud.
 * ========================================================================= */

export type Visibility = "publico" | "amigos" | "clube" | "somente-preco";

export interface CommunityPost {
  id: string;
  author: string;
  avatar: string;
  city: string;
  club?: string;
  createdAt: string;
  station: string;
  fuel: string;
  pricePerLiter: number;
  amountPaid?: number;
  kmPerLiter?: number;
  savings?: number;
  comment?: string;
  photo?: boolean;
  confirmations: number;
  likes: number;
  comments: number;
  visibility: Visibility;
  scope: "amigos" | "local" | "clube";
  mine?: boolean;
}

export interface Club {
  id: string;
  name: string;
  emoji: string;
  members: number;
  city?: string;
  description: string;
}

export interface RankingRow {
  name: string;
  city: string;
  value: string;
  contributions: number;
}

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  goal: number;
}

export interface Mission {
  id: string;
  title: string;
  period: "Semanal" | "Mensal";
  goal: number;
  xp: number;
  progressKey: "fillups" | "shares" | "confirmations" | "savings";
}

/* ------------------------------- interações ------------------------------ */

export interface Social {
  likes: string[];
  saved: string[];
  reported: string[];
  following: string[];
  clubs: string[];
  shares: number;
  confirmations: number;
  privacy: "publico" | "amigos" | "privado";
  hideOdometer: boolean;
}

export const useSocial = () =>
  usePersisted<Social>("tanque:social", {
    likes: [],
    saved: [],
    reported: [],
    following: ["Marina Alves"],
    clubs: ["fiat"],
    shares: 0,
    confirmations: 0,
    privacy: "publico",
    hideOdometer: false,
  });

export const useCommunityPosts = () => usePersisted<CommunityPost[]>("tanque:posts", []);

export function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

export function reliability(confirmations: number) {
  if (confirmations >= 12) return { label: "Muito alta", pct: 95 };
  if (confirmations >= 6) return { label: "Alta", pct: 80 };
  if (confirmations >= 3) return { label: "Média", pct: 60 };
  return { label: "Em verificação", pct: 35 };
}

/* -------------------------------- conteúdo ------------------------------- */

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

export const SEED_POSTS: CommunityPost[] = [
  {
    id: "p1",
    author: "Marina Alves",
    avatar: "MA",
    city: "Goiânia, GO",
    club: "Fiat",
    createdAt: ago(14),
    station: "Posto Ipiranga Centro",
    fuel: "Gasolina",
    pricePerLiter: 5.69,
    amountPaid: 180,
    kmPerLiter: 13.8,
    savings: 12.4,
    comment: "Fila curta e frentista atencioso. Preço caiu 8 centavos hoje.",
    photo: true,
    confirmations: 14,
    likes: 42,
    comments: 6,
    visibility: "publico",
    scope: "amigos",
  },
  {
    id: "p2",
    author: "Rafael Duarte",
    avatar: "RD",
    city: "Goiânia, GO",
    club: "Motoristas de Aplicativo",
    createdAt: ago(52),
    station: "Shell Av. Brasil",
    fuel: "Etanol",
    pricePerLiter: 3.89,
    amountPaid: 120,
    kmPerLiter: 9.4,
    savings: 6.1,
    comment: "Etanol compensando pra quem roda muito na cidade.",
    confirmations: 7,
    likes: 28,
    comments: 3,
    visibility: "publico",
    scope: "clube",
  },
  {
    id: "p3",
    author: "Camila Souza",
    avatar: "CS",
    city: "Aparecida de Goiânia, GO",
    createdAt: ago(120),
    station: "Petrobras Rodovia Norte",
    fuel: "Gasolina",
    pricePerLiter: 5.84,
    confirmations: 4,
    likes: 11,
    comments: 1,
    visibility: "somente-preco",
    scope: "local",
  },
  {
    id: "p4",
    author: "Diego Martins",
    avatar: "DM",
    city: "Goiânia, GO",
    club: "Carros Diesel",
    createdAt: ago(300),
    station: "Posto Vale Alto",
    fuel: "Diesel S10",
    pricePerLiter: 6.12,
    amountPaid: 320,
    kmPerLiter: 11.2,
    savings: 21.7,
    comment: "Combustível de qualidade, rendeu bem na estrada.",
    photo: true,
    confirmations: 9,
    likes: 33,
    comments: 4,
    visibility: "publico",
    scope: "clube",
  },
];

export const CLUBS: Club[] = [
  { id: "fiat", name: "Fiat", emoji: "🚗", members: 12840, description: "Donos de Fiat trocando consumo real e dicas." },
  { id: "vw", name: "Volkswagen", emoji: "🚙", members: 10422, description: "Consumo, manutenção e economia VW." },
  { id: "chevrolet", name: "Chevrolet", emoji: "🛻", members: 9310, description: "Onix, Tracker, S10 e companhia." },
  { id: "toyota", name: "Toyota", emoji: "🚘", members: 7180, description: "Híbridos e flex com foco em economia." },
  { id: "honda", name: "Honda", emoji: "🏍️", members: 5904, description: "Rendimento e cuidados com o motor." },
  { id: "apps", name: "Motoristas de Aplicativo", emoji: "📱", members: 21400, description: "Quem roda o dia todo e precisa gastar menos." },
  { id: "entregadores", name: "Entregadores", emoji: "🛵", members: 15320, description: "Rotas curtas, muitos abastecimentos." },
  { id: "flex", name: "Carros Flex", emoji: "🌽", members: 18240, description: "Gasolina x etanol na prática." },
  { id: "diesel", name: "Carros Diesel", emoji: "⛽", members: 6120, description: "Consumo em estrada e cargas." },
  { id: "goiania", name: "Goiânia", emoji: "📍", members: 8420, city: "Goiânia", description: "Preços e postos da capital goiana." },
  { id: "brasilia", name: "Brasília", emoji: "📍", members: 11230, city: "Brasília", description: "Radar de preços do DF." },
  { id: "sp", name: "São Paulo", emoji: "📍", members: 32110, city: "São Paulo", description: "A maior comunidade do país." },
];

export const RANKINGS: Record<string, RankingRow[]> = {
  economia: [
    { name: "Marina Alves", city: "Goiânia", value: "R$ 214 economizados", contributions: 38 },
    { name: "Diego Martins", city: "Goiânia", value: "R$ 189 economizados", contributions: 27 },
    { name: "Camila Souza", city: "Aparecida", value: "R$ 152 economizados", contributions: 19 },
    { name: "Rafael Duarte", city: "Goiânia", value: "R$ 141 economizados", contributions: 44 },
  ],
  contribuicao: [
    { name: "Rafael Duarte", city: "Goiânia", value: "44 preços enviados", contributions: 44 },
    { name: "Marina Alves", city: "Goiânia", value: "38 preços enviados", contributions: 38 },
    { name: "Bruno Lima", city: "Brasília", value: "31 preços enviados", contributions: 31 },
    { name: "Camila Souza", city: "Aparecida", value: "19 preços enviados", contributions: 19 },
  ],
  confiabilidade: [
    { name: "Marina Alves", city: "Goiânia", value: "98% de confirmações", contributions: 38 },
    { name: "Bruno Lima", city: "Brasília", value: "95% de confirmações", contributions: 31 },
    { name: "Diego Martins", city: "Goiânia", value: "92% de confirmações", contributions: 27 },
    { name: "Rafael Duarte", city: "Goiânia", value: "89% de confirmações", contributions: 44 },
  ],
};

export const BADGES: Badge[] = [
  { id: "b1", icon: "🥉", title: "Primeiro abastecimento", description: "Registre seu primeiro abastecimento", goal: 1 },
  { id: "b2", icon: "🥈", title: "10 abastecimentos", description: "Registre 10 abastecimentos", goal: 10 },
  { id: "b3", icon: "🥇", title: "Economia de R$100", description: "Acumule R$100 de economia", goal: 100 },
  { id: "b4", icon: "💎", title: "Economia de R$1.000", description: "Acumule R$1.000 de economia", goal: 1000 },
  { id: "b5", icon: "🏆", title: "Compartilhou 100 preços", description: "Envie 100 preços para a comunidade", goal: 100 },
  { id: "b6", icon: "🏆", title: "Contribuidor da Comunidade", description: "Confirme 25 informações de postos", goal: 25 },
  { id: "b7", icon: "🏆", title: "Explorador de Postos", description: "Abasteça em 10 postos diferentes", goal: 10 },
  { id: "b8", icon: "🏆", title: "Mestre da Economia", description: "Fique 3 meses abaixo do custo médio por km", goal: 3 },
];

export const LEVELS = [
  { level: 1, name: "Motorista Iniciante", xp: 0 },
  { level: 2, name: "Econômico", xp: 150 },
  { level: 3, name: "Especialista", xp: 400 },
  { level: 4, name: "Caçador de Ofertas", xp: 800 },
  { level: 5, name: "Mestre do Tanque+", xp: 1500 },
];

export const MISSIONS: Mission[] = [
  { id: "m1", title: "Compartilhe 5 preços", period: "Semanal", goal: 5, xp: 120, progressKey: "shares" },
  { id: "m2", title: "Confirme 3 informações de postos", period: "Semanal", goal: 3, xp: 80, progressKey: "confirmations" },
  { id: "m3", title: "Registre todos os abastecimentos do mês", period: "Mensal", goal: 4, xp: 250, progressKey: "fillups" },
  { id: "m4", title: "Economize R$50", period: "Mensal", goal: 50, xp: 200, progressKey: "savings" },
];

export function computeXp(input: {
  fillups: number;
  shares: number;
  confirmations: number;
  savings: number;
}) {
  return Math.round(
    input.fillups * 40 + input.shares * 25 + input.confirmations * 15 + input.savings * 0.5,
  );
}

export function levelFor(xp: number) {
  const current = [...LEVELS].reverse().find((l) => xp >= l.xp) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.xp > xp);
  const span = (next?.xp ?? current.xp + 500) - current.xp;
  return { current, next, progress: Math.min(100, ((xp - current.xp) / span) * 100) };
}

/* --------------------------- radar de economia --------------------------- */

export interface RadarStation {
  id: string;
  name: string;
  city: string;
  gasoline: number;
  ethanol: number;
  distanceKm: number;
  rating: number;
  busy: "Baixo" | "Médio" | "Alto";
  trend: number;
  updatedAt: string;
  confirmations: number;
  history: { day: string; price: number }[];
}

export const RADAR: RadarStation[] = [
  {
    id: "r1",
    name: "Posto Ipiranga Centro",
    city: "Goiânia",
    gasoline: 5.69,
    ethanol: 3.79,
    distanceKm: 0.8,
    rating: 4.7,
    busy: "Médio",
    trend: -0.08,
    updatedAt: ago(14),
    confirmations: 14,
    history: [
      { day: "Seg", price: 5.85 },
      { day: "Ter", price: 5.83 },
      { day: "Qua", price: 5.79 },
      { day: "Qui", price: 5.77 },
      { day: "Sex", price: 5.69 },
    ],
  },
  {
    id: "r2",
    name: "Shell Av. Brasil",
    city: "Goiânia",
    gasoline: 5.79,
    ethanol: 3.89,
    distanceKm: 1.4,
    rating: 4.5,
    busy: "Alto",
    trend: 0.04,
    updatedAt: ago(52),
    confirmations: 7,
    history: [
      { day: "Seg", price: 5.72 },
      { day: "Ter", price: 5.74 },
      { day: "Qua", price: 5.75 },
      { day: "Qui", price: 5.78 },
      { day: "Sex", price: 5.79 },
    ],
  },
  {
    id: "r3",
    name: "Petrobras Rodovia Norte",
    city: "Goiânia",
    gasoline: 5.84,
    ethanol: 3.94,
    distanceKm: 2.6,
    rating: 4.2,
    busy: "Baixo",
    trend: 0.18,
    updatedAt: ago(120),
    confirmations: 4,
    history: [
      { day: "Seg", price: 5.66 },
      { day: "Ter", price: 5.7 },
      { day: "Qua", price: 5.74 },
      { day: "Qui", price: 5.8 },
      { day: "Sex", price: 5.84 },
    ],
  },
  {
    id: "r4",
    name: "Posto Vale Alto",
    city: "Aparecida",
    gasoline: 5.92,
    ethanol: 4.05,
    distanceKm: 3.1,
    rating: 3.9,
    busy: "Médio",
    trend: -0.02,
    updatedAt: ago(240),
    confirmations: 3,
    history: [
      { day: "Seg", price: 5.95 },
      { day: "Ter", price: 5.94 },
      { day: "Qua", price: 5.94 },
      { day: "Qui", price: 5.93 },
      { day: "Sex", price: 5.92 },
    ],
  },
];

export const STATION_CRITERIA = [
  "Qualidade do combustível",
  "Atendimento",
  "Limpeza",
  "Rapidez",
  "Conveniência",
  "Segurança",
  "Facilidade de acesso",
];

/* ------------------------------ IA comunidade ---------------------------- */

export function communityInsights(avgKmL: number, tankSize = 40): string[] {
  const cheapest = [...RADAR].sort((a, b) => a.gasoline - b.gasoline)[0];
  const priciest = [...RADAR].sort((a, b) => b.gasoline - a.gasoline)[0];
  const economy = (priciest.gasoline - cheapest.gasoline) * tankSize;
  const rising = RADAR.filter((r) => r.trend > 0.1);
  return [
    `Hoje há ${RADAR.length} postos próximos e abastecer no ${cheapest.name} pode gerar uma economia estimada de R$ ${economy.toFixed(2)}.`,
    avgKmL
      ? `Seu carro está rendendo melhor que 72% dos veículos iguais ao seu na sua região.`
      : "Registre abastecimentos para comparar seu rendimento com o da comunidade.",
    rising.length
      ? `O ${rising[0].name} teve aumento de R$ ${rising[0].trend.toFixed(2)} por litro nas últimas 48 horas.`
      : "Os preços da sua região estão estáveis nas últimas 48 horas.",
    "A gasolina está mais vantajosa que o etanol na sua região (relação atual de 66%).",
  ];
}
