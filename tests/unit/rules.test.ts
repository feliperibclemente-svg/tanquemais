import { describe, expect, it } from "vitest";
import { computeBetaMetrics, weekStart } from "@/services/beta-metrics";
import { canonicalVehicle } from "@/constants/vehicles";
import {
  formatCents,
  maskCents,
  maskInteger,
  nextCentsValue,
  parseDecimal,
} from "@/components/app/NumericField";
import { fullTanksMissing, validateOdometer } from "@/services/analytics";
import { priceVerdict } from "@/services/verdict";

const at = (d: string) => new Date(`${d}T12:00:00`);
const row = (id: string, d: string, odometer: number) => ({
  id,
  filled_at: at(d).toISOString(),
  odometer,
});

describe("validateOdometer", () => {
  const rows = [row("a", "2026-09-01", 1000), row("b", "2026-09-20", 1500)];
  it("km deve ser maior que o do registro anterior", () => {
    expect(validateOdometer(rows, at("2026-09-10"), 900)).toMatch(/maior/);
  });
  it("km deve ser menor que o do registro seguinte", () => {
    expect(validateOdometer(rows, at("2026-09-10"), 1600)).toMatch(/menor/);
  });
  it("km entre vizinhos é aceito", () => {
    expect(validateOdometer(rows, at("2026-09-10"), 1200)).toBeNull();
  });
});

describe("priceVerdict", () => {
  const ref = (id: string, d: string, price: number) =>
    ({
      id,
      vehicle_id: "v",
      fuel_type_id: "gasolina",
      filled_at: at(d).toISOString(),
      price_per_liter: price,
    }) as never;
  it("com 2 referências diz quantas faltam (precisa de 3)", () => {
    const v = priceVerdict([ref("1", "2026-09-10", 6), ref("2", "2026-09-05", 6)], {
      pricePerLiter: 5.5,
      liters: 40,
      fuelTypeId: "gasolina",
      vehicleId: "v",
      at: at("2026-09-15"),
    });
    expect(v.headline).toBe("Falta 1 registro para comparar o preço");
  });
  it("com 3 referências compara", () => {
    const v = priceVerdict(
      [ref("1", "2026-09-10", 6), ref("2", "2026-09-05", 6), ref("3", "2026-09-01", 6)],
      {
        pricePerLiter: 5.5,
        liters: 40,
        fuelTypeId: "gasolina",
        vehicleId: "v",
        at: at("2026-09-15"),
      },
    );
    expect(v.tone).toBe("good");
    expect(v.amount).toBeCloseTo(20);
  });
});

describe("fullTanksMissing", () => {
  it("sem tanque cheio com km faltam 2", () => {
    expect(fullTanksMissing([{ full_tank: false, odometer: 1000 }])).toBe(2);
    expect(fullTanksMissing([])).toBe(2);
  });
  it("com um tanque cheio com km falta 1", () => {
    expect(fullTanksMissing([{ full_tank: true, odometer: 1000 }])).toBe(1);
  });
});

describe("máscaras de valores", () => {
  it("dinheiro entra pela direita com vírgula e milhar", () => {
    expect(maskCents("5")).toBe("0,05");
    expect(maskCents("5000")).toBe("50,00");
    expect(maskCents("123456")).toBe("1.234,56");
    expect(maskCents("R$ 0,507")).toBe("5,07");
    expect(maskCents("")).toBe("");
  });
  it("preço por litro usa 3 casas", () => {
    expect(maskCents("5899", 3)).toBe("5,899");
    expect(formatCents(5.79, 3)).toBe("5,790");
  });
  it("valores rápidos viram reais inteiros", () => {
    expect(formatCents(50)).toBe("50,00");
    expect(parseDecimal(formatCents(300))).toBe(300);
    expect(parseDecimal("1.234,56")).toBeCloseTo(1234.56);
  });
  it("quilometragem ganha separador de milhar", () => {
    expect(maskInteger("45230")).toBe("45.230");
    expect(parseDecimal(maskInteger("1234567"))).toBe(1234567);
  });
});

describe("campo de dinheiro aceita vírgula", () => {
  it("5 + vírgula + 89 vira 5,89 (não 0,589)", () => {
    let state = nextCentsValue("", "5", 3, false);
    expect(state.value).toBe("0,005");
    state = nextCentsValue(state.value, `${state.value},`, 3, state.natural);
    expect(state).toEqual({ value: "5,", natural: true });
    state = nextCentsValue(state.value, "5,89", 3, state.natural);
    expect(state.value).toBe("5,89");
    expect(parseDecimal(state.value)).toBeCloseTo(5.89);
  });
  it("apagar tudo volta para a máscara de maquininha", () => {
    expect(nextCentsValue("5,", "", 3, true)).toEqual({ value: "", natural: false });
  });
});

describe("catálogo de veículos", () => {
  it("padroniza a grafia de marcas e modelos conhecidos", () => {
    expect(canonicalVehicle("chevrolet", "onix plus")).toEqual({
      brand: "Chevrolet",
      model: "Onix Plus",
    });
    expect(canonicalVehicle("citroen", "c3")).toEqual({ brand: "Citroën", model: "C3" });
  });
  it("mantém o que foi digitado quando não está no catálogo", () => {
    expect(canonicalVehicle(" Lada ", "Niva ")).toEqual({ brand: "Lada", model: "Niva" });
    expect(canonicalVehicle("Fiat", "147")).toEqual({ brand: "Fiat", model: "147" });
  });
});

describe("preço por litro com 2 casas", () => {
  it("5 8 9 vira 5,89", () => {
    expect(maskCents("589", 2)).toBe("5,89");
    expect(formatCents(5.79, 2)).toBe("5,79");
    expect(nextCentsValue("0,05", "0,05,", 2, false)).toEqual({ value: "5,", natural: true });
  });
});

describe("métricas do beta", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const daysAgo = (d: number, h = 0) =>
    new Date(now.getTime() - d * 86_400_000 - h * 3_600_000).toISOString();
  const metrics = computeBetaMetrics({
    now,
    users: [
      { id: "a", created_at: daysAgo(30) },
      { id: "b", created_at: daysAgo(10) },
      { id: "c", created_at: daysAgo(0, 5) },
    ],
    vehicles: [
      { user_id: "a", brand: "Fiat", model: "Argo" },
      { user_id: "b", brand: "Fiat", model: "Argo" },
    ],
    fuelings: [
      { user_id: "a", created_at: daysAgo(29) },
      { user_id: "a", created_at: daysAgo(20) },
      { user_id: "a", created_at: daysAgo(12) },
      { user_id: "b", created_at: daysAgo(5) },
    ],
    events: [{ user_id: "c", name: "app_installed", created_at: daysAgo(0, 1) }],
    feedback: [
      { kind: "elogio", rating: 5, message: "Ótimo", page: "/app", created_at: daysAgo(1) },
      {
        kind: "problema",
        rating: 3,
        message: "Travou",
        page: "/abastecer",
        created_at: daysAgo(2),
      },
    ],
  });
  it("monta o funil", () => {
    expect(metrics.funnel).toEqual({
      signups: 3,
      withVehicle: 2,
      withFirstFueling: 2,
      withThreeFuelings: 1,
    });
  });
  it("ativação em 48 h só conta quem já teve 48 h", () => {
    expect(metrics.activation48h).toEqual({ eligible: 2, activated: 1, rate: 0.5 });
  });
  it("3 abastecimentos em 21 dias", () => {
    expect(metrics.threeIn21Days).toEqual({ eligible: 1, reached: 1, rate: 1 });
  });
  it("feedback, instalações e veículos", () => {
    expect(metrics.feedback.averageRating).toBe(4);
    expect(metrics.installs).toBe(1);
    expect(metrics.topVehicles[0]).toEqual({ name: "Fiat Argo", count: 2 });
    expect(metrics.weeks).toHaveLength(6);
  });
  it("semana começa na segunda", () => {
    expect(weekStart(new Date("2026-10-14T12:00:00Z"))).toBe("2026-10-12");
  });
});
