import { daysAgo, expect, fueling, test } from "./fixtures";

test("histórico: totais por período e detalhes do registro", async ({ page, db }) => {
  db.fuelings = [
    fueling(3, { odometer: 10960, filled_at: daysAgo(1), total_cost: 236, price_per_liter: 5.9 }),
    fueling(2, { odometer: 10480, filled_at: daysAgo(40), total_cost: 244, price_per_liter: 6.1 }),
    fueling(1, { odometer: 10000, filled_at: daysAgo(80), total_cost: 240 }),
  ];

  await page.goto("/historico");
  await expect(page.getByText(/R\$\s720,00 em 3 abastecimentos/)).toBeVisible();

  await page.getByText("3 meses", { exact: true }).click();
  await expect(page.getByText(/em 3 abastecimentos/)).toBeVisible();

  await page.getByText("Tudo", { exact: true }).click();
  await page.getByRole("button", { name: /R\$\s236,00/ }).click();
  await expect(page.getByText("12,0 km/L")).toBeVisible(); // 480 km ÷ 40 L
  await expect(page.getByRole("button", { name: /planilha/i })).toBeEnabled();
});
