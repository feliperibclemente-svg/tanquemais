import { expect, test } from "./fixtures";

test("cadastro: dados básicos e veículo chegam ao banco", async ({ page, db }) => {
  db.profile = { id: db.profile.id, first_name: null, last_name: null, birth_date: null };
  db.vehicles = [];

  await page.goto("/boas-vindas");
  await page.getByLabel("Nome", { exact: true }).fill("Ana");
  await page.getByLabel("Sobrenome").fill("Souza");
  await page.getByLabel("Data de nascimento").fill("01051990");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect
    .poll(() => db.writes.find((w) => w.table === "profiles" && w.method === "PATCH")?.body)
    .toMatchObject({ first_name: "Ana", last_name: "Souza", birth_date: "1990-05-01" });

  await page.getByLabel("Marca").selectOption("Fiat");
  await page.getByLabel("Modelo").selectOption("Argo");
  await page.getByLabel("Quilometragem atual").fill("25000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect
    .poll(() => db.writes.find((w) => w.table === "vehicles" && w.method === "POST")?.body)
    .toMatchObject({ brand: "Fiat", model: "Argo", current_odometer: 25000 });
});
