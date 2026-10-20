import { daysAgo, expect, fueling, test } from "./fixtures";

test.beforeEach(({ db }) => {
  db.fuelings = [fueling(1, { odometer: 11700, filled_at: daysAgo(7), price_per_liter: 5.99 })];
});

test("abastecer: valor, preço e km viram litros e são gravados", async ({ page, db }) => {
  await page.goto("/abastecer");
  await page.getByText("R$ 50", { exact: true }).click();
  await page.getByLabel("Preço por litro").fill("625");
  await page.getByLabel("Quilometragem atual").fill("12150");
  await page.getByRole("button", { name: /Registrar abastecimento/ }).click();

  await expect
    .poll(() => db.writes.find((w) => w.table === "fuelings" && w.method === "POST")?.body)
    .toMatchObject({ total_cost: 50, price_per_liter: 6.25, liters: 8, odometer: 12150 });
});

test("abastecer: km menor que o anterior é recusado", async ({ page, db }) => {
  await page.goto("/abastecer");
  await page.getByText("R$ 50", { exact: true }).click();
  await page.getByLabel("Preço por litro").fill("625");
  await page.getByLabel("Quilometragem atual").fill("11000");
  await page.getByRole("button", { name: /Registrar abastecimento/ }).click();

  await expect(page.getByText(/precisa ser maior que a do registro anterior/)).toBeVisible();
  expect(db.writes.filter((w) => w.table === "fuelings")).toHaveLength(0);
});

test("abastecer: km com dígito a mais pede confirmação antes de gravar", async ({ page, db }) => {
  await page.goto("/abastecer");
  await page.getByText("R$ 50", { exact: true }).click();
  await page.getByLabel("Preço por litro").fill("625");
  await page.getByLabel("Quilometragem atual").fill("117000");
  await expect(page.getByText(/Confere o km\?/)).toBeVisible();

  await page.getByRole("button", { name: /Registrar abastecimento/ }).click();
  expect(db.writes.filter((w) => w.table === "fuelings")).toHaveLength(0);

  await page.getByRole("button", { name: "O km está certo" }).click();
  await page.getByRole("button", { name: /Registrar abastecimento/ }).click();
  await expect
    .poll(() => db.writes.filter((w) => w.table === "fuelings" && w.method === "POST").length)
    .toBe(1);
});
