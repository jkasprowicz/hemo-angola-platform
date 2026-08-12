import { expect, test } from "@playwright/test";

const demoPassword = process.env.E2E_DEMO_PASSWORD;

if (!demoPassword) {
  throw new Error("E2E_DEMO_PASSWORD must be defined for end-to-end tests.");
}

test("critical local-first flow", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/login");
  await expect(page).toHaveTitle("HEMO-DATA | Indicadores Hemoterápicos");
  await expect(page.getByText("HEMO-DATA")).toBeVisible();
  await page.getByLabel("Usuário").fill("operador");
  await page.getByLabel("Senha").fill(demoPassword);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await expect(page.getByText("Iniciar nova coleta")).toBeVisible();
  await page.getByRole("button", { name: "Iniciar nova coleta" }).click();

  await context.setOffline(true);
  await expect(page.getByText("Você está offline")).toBeVisible();

  await page.getByLabel("Doações voluntárias/espontâneas").fill("320");
  await page.getByLabel("Doações de reposição").fill("680");
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Candidatos aptos").fill("850");
  await page.getByLabel("Candidatos inaptos").fill("150");
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Amostras/bolsas testadas").fill("850");
  await page.getByLabel("Amostras/bolsas reagentes para um ou mais marcadores").fill("21");
  await page.getByLabel("Observação geral do período").fill("Observação demonstrativa.");
  await expect(page.getByText("Salvo neste dispositivo.", { exact: true })).toBeVisible();
  await page.reload();

  const observationField = page.getByLabel("Observação geral do período");
  if ((await page.getByRole("button", { name: "Continuar" }).count()) > 0) {
    await page.getByRole("button", { name: "Continuar" }).click();
  }
  for (let index = 0; index < 3 && (await observationField.count()) === 0; index += 1) {
    await page.getByRole("button", { name: "Próximo" }).click();
  }
  await expect(page.getByLabel("Observação geral do período")).toHaveValue("Observação demonstrativa.");

  await page.close();
  const reopenedPage = await context.newPage();
  await reopenedPage.goto("/");
  await reopenedPage.getByRole("button", { name: "Continuar" }).click();
  await reopenedPage.getByRole("button", { name: "Próximo" }).click();
  await reopenedPage.getByRole("button", { name: "Próximo" }).click();
  await expect(reopenedPage.getByLabel("Observação geral do período")).toHaveValue("Observação demonstrativa.");

  await reopenedPage.getByRole("button", { name: "Fechar coleta" }).click();
  await reopenedPage.getByRole("link", { name: "Sincronização", exact: true }).click();
  await context.setOffline(false);
  await reopenedPage.getByLabel("Selecionar todos").check();
  await reopenedPage.getByRole("button", { name: "Sincronizar selecionados" }).click();

  await expect(reopenedPage.getByRole("cell", { name: "Coleta recebida pelo servidor" })).toBeVisible();
  await expect(reopenedPage.getByText("Nenhuma coleta fechada aguardando envio.")).toBeVisible();

  await reopenedPage.getByRole("link", { name: "Registros", exact: true }).click();
  await expect(reopenedPage.locator("text=Recebida").first()).toBeVisible();
  await reopenedPage.getByRole("button", { name: "Ver" }).first().click();
  await expect(reopenedPage.getByText("Observação demonstrativa.")).toBeVisible();
  await expect(reopenedPage.getByText("Doações voluntárias/espontâneas")).toBeVisible();
  await expect(reopenedPage.getByText("320")).toBeVisible();

  const serverResponse = await reopenedPage.request.get("/api/records/server/");
  expect(serverResponse.ok()).toBeTruthy();
  const serverPayload = await serverResponse.json();
  const firstCount = serverPayload.records.length;
  expect(firstCount).toBeGreaterThan(0);
  expect(serverPayload.records[0]?.status).toBe("received");

  await reopenedPage.goto("/sincronizacao");
  await expect(reopenedPage.getByText("Nenhuma coleta fechada aguardando envio.")).toBeVisible();
  const secondResponse = await reopenedPage.request.get("/api/records/server/");
  const secondPayload = await secondResponse.json();

  expect(secondPayload.records.length).toBe(firstCount);

  await reopenedPage.getByRole("button", { name: "Sair" }).click();
  await expect(reopenedPage).toHaveURL(/\/login$/);
  await expect(reopenedPage.getByRole("heading", { name: "Entrar" })).toBeVisible();

  const sessionResponse = await reopenedPage.request.get("/api/auth/session/");
  const sessionPayload = await sessionResponse.json();
  expect(sessionPayload.authenticated).toBe(false);

  await reopenedPage.goto("/");
  await expect(reopenedPage).toHaveURL(/\/login$/);

  await reopenedPage.getByLabel("Usuário").fill("operador");
  await reopenedPage.getByLabel("Senha").fill(demoPassword);
  await reopenedPage.getByRole("button", { name: "Entrar" }).click();
  await expect(reopenedPage).toHaveURL(/\/inicio$/);
  await expect(reopenedPage.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(reopenedPage.getByRole("heading", { name: "Início" })).toBeVisible();
});

test("logout redirects immediately and blocks protected routes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill("operador");
  await page.getByLabel("Senha").fill(demoPassword);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

  await page.goto("/sincronizacao");
  await expect(page).toHaveURL(/\/login$/);
});
