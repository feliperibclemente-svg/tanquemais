import { describe, expect, it } from "vitest";
import { computeBetaMetrics } from "@/services/beta-metrics";

const now = new Date(2026, 9, 21, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const fueling = (user: string, vehicle: string, n: number, odometer: number, full = true) => ({
  id: `${user}-${n}`,
  user_id: user,
  vehicle_id: vehicle,
  created_at: daysAgo(20 - n),
  filled_at: daysAgo(20 - n),
  odometer,
  liters: 40,
  total_cost: 240,
  price_per_liter: 6,
  full_tank: full,
  fuel_type_id: "gasolina",
});

const base = {
  now,
  users: [
    { id: "a", created_at: daysAgo(30) },
    { id: "b", created_at: daysAgo(30) },
    { id: "c", created_at: daysAgo(3) },
  ],
  vehicles: [],
  feedback: [],
};

describe("métricas do núcleo no painel admin", () => {
  it("conta 2º abastecimento e primeiro consumo real", () => {
    const m = computeBetaMetrics({
      ...base,
      // a: dois tanques cheios (tem consumo); b: dois parciais (não tem)
      fuelings: [
        fueling("a", "va", 1, 10000),
        fueling("a", "va", 2, 10480),
        fueling("b", "vb", 1, 5000, false),
        fueling("b", "vb", 2, 5300, false),
      ],
      events: [],
    });
    expect(m.funnel.withSecondFueling).toBe(2);
    expect(m.funnel.withRealConsumption).toBe(1);
  });

  it("sem os campos do cálculo, o consumo real fica indisponível", () => {
    const m = computeBetaMetrics({
      ...base,
      fuelings: [{ user_id: "a", created_at: daysAgo(2) }],
      events: [],
    });
    expect(m.funnel.withRealConsumption).toBeNull();
  });

  it("telas, erros do formulário, falhas offline e origem", () => {
    const ev = (user: string, name: string, props: object = {}, days = 1) => ({
      user_id: user,
      name,
      created_at: daysAgo(days),
      props,
    });
    const m = computeBetaMetrics({
      ...base,
      fuelings: [fueling("a", "va", 1, 10000)],
      events: [
        ev("a", "screen_viewed", { screen: "painel" }),
        ev("a", "screen_viewed", { screen: "painel" }),
        ev("b", "screen_viewed", { screen: "painel" }),
        ev("b", "screen_viewed", { screen: "historico" }, 10), // fora dos 7 dias
        ev("a", "fueling_form_opened"),
        ev("b", "fueling_form_opened"),
        ev("a", "fueling_created"),
        ev("b", "fueling_form_error", { reason: "km_menor_que_anterior" }),
        ev("b", "fueling_sync_failed", { attempt: 1 }),
        ev("a", "funnel_signup_completed", { source: "instagram" }, 25),
        ev("b", "funnel_signup_completed", { source: "instagram" }, 25),
        ev("c", "funnel_signup_completed", {}, 2),
      ],
    });
    expect(m.core.screens).toEqual({ painel: 2 });
    expect(m.core.formOpened).toBe(2);
    expect(m.core.fuelingsCreated).toBe(1);
    expect(m.core.formErrors).toEqual({ km_menor_que_anterior: 1 });
    expect(m.core.syncFailures).toBe(1);
    expect(m.sources).toEqual([
      { source: "instagram", signups: 2, withFirstFueling: 1 },
      { source: "direto", signups: 1, withFirstFueling: 0 },
    ]);
  });
});
