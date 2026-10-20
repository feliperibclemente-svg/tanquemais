/* =========================================================================
 * Simulação de viagem: distância ÷ consumo × preço. É uma estimativa: trânsito,
 * serra, carga, ar-condicionado e velocidade mudam o consumo de verdade.
 * Testado em tests/unit/trip.test.ts.
 * ========================================================================= */

export interface TripInput {
  /** km de ida */
  km: number;
  roundTrip: boolean;
  kmPerLiter: number;
  price: number;
  tankLiters?: number | null;
}

export interface TripResult {
  distance: number;
  liters: number;
  cost: number;
  /** Tanques cheios (só com a capacidade do tanque cadastrada). */
  tanks: number | null;
}

export const TRIP_MAX_KM = 10_000;

export function simulateTrip(i: TripInput): TripResult | null {
  if (!(i.km > 0) || i.km > TRIP_MAX_KM || !(i.kmPerLiter > 0) || !(i.price > 0)) return null;
  const distance = i.roundTrip ? i.km * 2 : i.km;
  const liters = distance / i.kmPerLiter;
  const cost = liters * i.price;
  const tanks = i.tankLiters && i.tankLiters > 0 ? liters / i.tankLiters : null;
  return { distance, liters, cost, tanks };
}

/** "menos de 1 tanque", "cerca de 1,5 tanque", "cerca de 3 tanques". */
export function tanksText(tanks: number): string {
  if (tanks < 0.95) return "menos de 1 tanque cheio";
  const rounded = Math.round(tanks * 2) / 2;
  const n = rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `cerca de ${n} ${rounded >= 2 ? "tanques cheios" : "tanque cheio"}`;
}

/** Link do Google Maps com o trajeto até o destino (a pessoa vê a distância e os postos lá). */
export function mapsDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.trim())}`;
}
