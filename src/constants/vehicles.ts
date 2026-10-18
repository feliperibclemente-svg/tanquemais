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
    models: [
      "ADV 160",
      "Biz 110i",
      "Biz 125",
      "CB 300F Twister",
      "CB 500",
      "CG 160 Fan",
      "CG 160 Start",
      "CG 160 Titan",
      "Elite 125",
      "NC 750X",
      "NXR 160 Bros",
      "PCX 160",
      "Pop 110i",
      "Sahara 300",
      "XRE 190",
      "XRE 300",
    ],
  },
  {
    brand: "Yamaha",
    kind: "moto",
    models: [
      "Crosser 150",
      "Factor 150",
      "Fazer FZ15",
      "Fazer FZ25",
      "Fluo 125",
      "Lander 250",
      "MT-03",
      "MT-07",
      "Neo 125",
      "NMax 160",
      "XMax 250",
      "XTZ 150",
    ],
  },
  {
    brand: "Mottu",
    kind: "moto",
    models: ["Mottu Sport 110i", "Mottu-e"],
  },
  {
    brand: "Shineray",
    kind: "moto",
    models: ["Jet 125", "Phoenix 50", "SHI 175", "Worker 125"],
  },
  {
    brand: "Haojue",
    kind: "moto",
    models: ["DK 150", "DR 160", "NK 150", "Master Ride 150"],
  },
  {
    brand: "Suzuki Motos",
    kind: "moto",
    models: ["Burgman 125", "GSX-S750", "Intruder 125", "V-Strom 650", "Yes 125"],
  },
  {
    brand: "Kawasaki",
    kind: "moto",
    models: ["Ninja 400", "Versys 650", "Z400", "Z650", "Z900"],
  },
  {
    brand: "Royal Enfield",
    kind: "moto",
    models: ["Classic 350", "Himalayan 450", "Hunter 350", "Interceptor 650", "Meteor 350"],
  },
  {
    brand: "BMW Motorrad",
    kind: "moto",
    models: ["F 900 GS", "G 310 GS", "G 310 R", "R 1300 GS", "S 1000 RR"],
  },
  {
    brand: "Triumph",
    kind: "moto",
    models: ["Speed 400", "Street Triple", "Tiger 900", "Trident 660"],
  },
  {
    brand: "Dafra",
    kind: "moto",
    models: ["Apache 200", "Citycom 300", "Cruisym 150", "NH 190"],
  },
  {
    brand: "Harley-Davidson",
    kind: "moto",
    models: ["Fat Boy", "Nightster", "Pan America", "Sportster S"],
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

export type VehicleKind = "carro" | "moto";

/** Carro ou moto pela marca do catálogo; marca digitada livremente → null (não sabemos). */
export function vehicleKind(brand: string | null | undefined): VehicleKind | null {
  if (!brand) return null;
  const b = matchFrom(BRANDS, brand);
  return b ? (VEHICLE_CATALOG.find((x) => x.brand === b)?.kind ?? null) : null;
}

/** Palavras para o texto se adaptar ao veículo: "seu carro", "sua moto" ou "seu veículo". */
export function vehicleWords(brand: string | null | undefined) {
  const kind = vehicleKind(brand);
  if (kind === "moto")
    return {
      kind,
      noun: "moto",
      your: "sua moto",
      Your: "Sua moto",
      the: "a moto",
      ofThe: "da moto",
      parked: "parada",
      driving: "pilotando",
    };
  return {
    kind,
    noun: kind === "carro" ? "carro" : "veículo",
    your: kind === "carro" ? "seu carro" : "seu veículo",
    Your: kind === "carro" ? "Seu carro" : "Seu veículo",
    the: kind === "carro" ? "o carro" : "o veículo",
    ofThe: kind === "carro" ? "do carro" : "do veículo",
    parked: "parado",
    driving: "dirigindo",
  };
}

/** Nome da marca para exibir: "Honda Motos" → "Honda" (o tipo já está claro pelo contexto). */
export function brandLabel(brand: string | null | undefined): string {
  return (brand ?? "").replace(/ Motos$/, "");
}

/** Apelido ou "Marca Modelo" para exibir. */
export function vehicleName(v: {
  nickname?: string | null;
  brand: string | null;
  model: string | null;
}): string {
  return v.nickname || `${brandLabel(v.brand)} ${v.model ?? ""}`.trim();
}

/** Combustíveis que fazem sentido para o veículo: moto não tem diesel nem GNV. */
export function fuelsFor<T extends { id: string }>(
  brand: string | null | undefined,
  fuels: readonly T[],
): T[] {
  return vehicleKind(brand) === "moto"
    ? fuels.filter((f) => f.id !== "diesel" && f.id !== "gnv")
    : [...fuels];
}
