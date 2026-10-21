import { daysAgo, expect, fueling, test, type MockDb } from "./fixtures";

/** Eventos enviados ao banco (o app agrupa e envia a cada 5 s). */
const sentEvents = (db: MockDb) =>
  db.writes
    .filter((w) => w.table === "events" && w.method === "POST")
    .flatMap((w) => (Array.isArray(w.body) ? w.body : [w.body])) as {
    name: string;
    props: Record<string, unknown>;
  }[];

test("mensuração: telas consultadas, erro do formulário e registro sem valores", async ({
  page,
  db,
}) => {
  db.fuelings = [fueling(1, { odometer: 11700, filled_at: daysAgo(7) })];

  // Navegação dentro do app (como a pessoa faz): os eventos ficam na fila até o envio.
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await page.goto("/historico");
  await expect(page.getByText("Filtre por período")).toBeVisible({ timeout: 20_000 });
  await nav.getByRole("link", { name: "Painel" }).click();
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
  await nav.getByRole("link", { name: "Histórico" }).click();
  await expect(page.getByText("Filtre por período")).toBeVisible();
  await nav.getByRole("link", { name: "Abastecer" }).click();
  await expect(page.getByLabel("Quilometragem atual")).toBeVisible();

  await page.getByText("R$ 50", { exact: true }).click();
  await page.getByLabel("Preço por litro").fill("625");
  await page.getByLabel("Quilometragem atual").fill("11000");
  await page.getByRole("button", { name: /Registrar abastecimento/ }).click();
  await page.getByLabel("Quilometragem atual").fill("12150");
  await page.getByRole("button", { name: /Registrar abastecimento/ }).click();

  await expect
    .poll(() => sentEvents(db).some((e) => e.name === "fueling_created"), {
      timeout: 15_000,
    })
    .toBe(true);
  const events = sentEvents(db);

  const screens = events.filter((e) => e.name === "screen_viewed").map((e) => e.props.screen);
  expect(screens.sort()).toEqual(["historico", "painel"]); // Histórico só uma vez por sessão
  expect(events.find((e) => e.name === "fueling_form_error")?.props).toEqual({
    reason: "km_menor_que_anterior",
  });
  expect(events.some((e) => e.name === "fueling_form_opened")).toBe(true);
  const created = events.find((e) => e.name === "fueling_created")!;
  expect(created.props).not.toHaveProperty("total_cost");
  expect(created.props).not.toHaveProperty("liters");
});
