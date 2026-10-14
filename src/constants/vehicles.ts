/**
 * Catálogo de marcas e modelos mais comuns no Brasil (carros e motos).
 *
 * Serve para padronizar o cadastro: "Onix", "onix 1.0" e "ONIX LT" viram o mesmo
 * modelo nas análises. Quem não encontrar o seu veículo escolhe "Outra marca" ou
 * "Outro modelo" e digita livremente.
 */
export interface BrandCatalog {
  brand: string;
  models: readonly string[];
  kind: "carro" | "moto";
}

export const VEHICLE_CATALOG: readonly BrandCatalog[] = [
  {
    brand: "Fiat",
    kind: "carro",
    models: [
      "Argo",
      "Cronos",
      "Doblò",
      "Fastback",
      "Fiorino",
      "Grand Siena",
      "Mobi",
      "Palio",
      "Pulse",
      "Punto",
      "Siena",
      "Strada",
      "Toro",
      "Uno",
    ],
  },
  {
    brand: "Volkswagen",
    kind: "carro",
    models: [
      "Amarok",
      "Fox",
      "Fusca",
      "Gol",
      "Golf",
      "Jetta",
      "Nivus",
      "Polo",
      "Saveiro",
      "SpaceFox",
      "T-Cross",
      "Taos",
      "Tera",
      "Up!",
      "Virtus",
      "Voyage",
    ],
  },
  {
    brand: "Chevrolet",
    kind: "carro",
    models: [
      "Agile",
      "Astra",
      "Celta",
      "Classic",
      "Cobalt",
      "Corsa",
      "Cruze",
      "Equinox",
      "Montana",
      "Onix",
      "Onix Plus",
      "Prisma",
      "S10",
      "Spin",
      "Tracker",
      "Trailblazer",
      "Vectra",
    ],
  },
  {
    brand: "Toyota",
    kind: "carro",
    models: ["Corolla", "Corolla Cross", "Etios", "Hilux", "RAV4", "SW4", "Yaris"],
  },
  {
    brand: "Hyundai",
    kind: "carro",
    models: ["Creta", "HB20", "HB20S", "i30", "ix35", "Santa Fe", "Tucson"],
  },
  { brand: "Jeep", kind: "carro", models: ["Commander", "Compass", "Renegade"] },
  {
    brand: "Renault",
    kind: "carro",
    models: ["Captur", "Clio", "Duster", "Kardian", "Kwid", "Logan", "Oroch", "Sandero", "Stepway"],
  },
  { brand: "Honda", kind: "carro", models: ["City", "Civic", "CR-V", "Fit", "HR-V", "WR-V"] },
  {
    brand: "Ford",
    kind: "carro",
    models: [
      "Bronco Sport",
      "EcoSport",
      "Fiesta",
      "Focus",
      "Fusion",
      "Ka",
      "Ka Sedan",
      "Maverick",
      "Ranger",
      "Territory",
    ],
  },
  { brand: "Nissan", kind: "carro", models: ["Frontier", "Kicks", "March", "Sentra", "Versa"] },
  {
    brand: "Peugeot",
    kind: "carro",
    models: ["207", "208", "2008", "3008", "308", "Partner"],
  },
  {
    brand: "Citroën",
    kind: "carro",
    models: ["Aircross", "Basalt", "C3", "C3 Aircross", "C4 Cactus"],
  },
  {
    brand: "Caoa Chery",
    kind: "carro",
    models: ["Arrizo 6", "Tiggo 5x", "Tiggo 7", "Tiggo 8"],
  },
  { brand: "BYD", kind: "carro", models: ["King", "Song Plus", "Song Pro"] },
  {
    brand: "Mitsubishi",
    kind: "carro",
    models: ["ASX", "Eclipse Cross", "L200 Triton", "Outlander", "Pajero"],
  },
  { brand: "Kia", kind: "carro", models: ["Cerato", "Picanto", "Sorento", "Sportage", "Stonic"] },
  { brand: "RAM", kind: "carro", models: ["1500", "2500", "Rampage"] },
  {
    brand: "Mercedes-Benz",
    kind: "carro",
    models: ["A 200", "C 180", "C 200", "C 300", "GLA 200"],
  },
  { brand: "BMW", kind: "carro", models: ["320i", "X1", "X3"] },
  { brand: "Audi", kind: "carro", models: ["A3", "A4", "Q3", "Q5"] },
  {
    brand: "Honda Motos",
    kind: "moto",
    models: ["Biz", "CB 300F Twister", "CG 160", "NXR 160 Bros", "PCX 160", "Pop 110i", "XRE 300"],
  },
  {
    brand: "Yamaha",
    kind: "moto",
    models: ["Crosser 150", "Factor 150", "Fazer FZ15", "Lander 250", "MT-03", "NMax 160"],
  },
];

export const BRANDS = VEHICLE_CATALOG.map((b) => b.brand);

export function modelsOf(brand: string): readonly string[] {
  return VEHICLE_CATALOG.find((b) => b.brand === brand)?.models ?? [];
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Encontra o nome oficial ignorando maiúsculas e acentos ("citroen" → "Citroën"). */
export function matchFrom(list: readonly string[], value: string): string | null {
  const key = normalize(value);
  return key ? (list.find((item) => normalize(item) === key) ?? null) : null;
}

/** Marca e modelo com a grafia do catálogo quando existirem nele; senão, como digitados. */
export function canonicalVehicle(brand: string, model: string) {
  const b = matchFrom(BRANDS, brand);
  const m = b ? matchFrom(modelsOf(b), model) : null;
  return { brand: b ?? brand.trim(), model: m ?? model.trim() };
}
