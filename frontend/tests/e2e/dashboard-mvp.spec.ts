import { expect, test, type Page } from "@playwright/test";

const demoPassword = process.env.E2E_DEMO_PASSWORD;

if (!demoPassword) {
  throw new Error("E2E_DEMO_PASSWORD must be defined for end-to-end tests.");
}


test.setTimeout(90_000);

test("unauthenticated user cannot access /dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("dashboard uses synced backend data and supports period drill-down", async ({ page }) => {
  await login(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard de Indicadores Hemoterápicos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar ao sistema" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Coleta", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar ao sistema" }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  await createAndSyncCollection(page, {
    month: "Janeiro",
    year: "2026",
    donationsVoluntary: "100",
    donationsReplacement: "100",
    clinicallyFit: "180",
    clinicallyUnfit: "20",
    testedSamples: "200",
    reactiveSamples: "4",
    observation: "Coleta demonstrativa de janeiro.",
  });

  await createAndSyncCollection(page, {
    month: "Fevereiro",
    year: "2026",
    donationsVoluntary: "200",
    donationsReplacement: "100",
    clinicallyFit: "170",
    clinicallyUnfit: "30",
    testedSamples: "300",
    reactiveSamples: "6",
    observation: "Coleta demonstrativa de fevereiro.",
  });

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard de Indicadores Hemoterápicos" })).toBeVisible();
  const contextBar = page.getByTestId("dashboard-context-bar");
  await expect(contextBar).toContainText("Coletas");
  await expect(contextBar).toContainText("2");
  await expect(page.getByText("Janeiro/2026 – Fevereiro/2026")).toBeVisible();
  await expect(page.getByText("60,0%")).toBeVisible();
  await expect(page.getByText("12,5%")).toBeVisible();
  await expect(page.locator("text=2,0%").first()).toBeVisible();
  await expect(page.getByLabel("Abrir coletas de Janeiro/2026")).toBeVisible();
  await expect(page.getByLabel("Abrir coletas de Fevereiro/2026")).toBeVisible();

  await page.locator("tr", { hasText: "Fevereiro/2026" }).getByRole("button", { name: "Ver coletas" }).click();
  await expect(page).toHaveURL(/\/registros\?period=\d+&source=dashboard$/);
  await expect(page.getByRole("heading", { name: "Registros" })).toBeVisible();
  await expect(page.getByText("Exibindo registros locais filtrados pelo período selecionado no dashboard.")).toBeVisible();
  await expect(page.locator("text=Fevereiro/2026").first()).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("dashboard header controls remain accessible across responsive viewports", async ({ page }) => {
  await login(page);

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");

    const backButton = page.getByRole("button", {
      name: viewport.width <= 768 ? "Sistema" : "Voltar ao sistema",
    });
    const logoutButton = page.getByRole("button", { name: "Sair" });

    await expect(backButton).toBeVisible();
    await expect(logoutButton).toBeVisible();

    const [backBox, logoutBox] = await Promise.all([backButton.boundingBox(), logoutButton.boundingBox()]);
    expect(backBox).not.toBeNull();
    expect(logoutBox).not.toBeNull();
    expect(backBox!.y + backBox!.height <= logoutBox!.y || logoutBox!.y + logoutBox!.height <= backBox!.y || backBox!.x + backBox!.width <= logoutBox!.x || logoutBox!.x + logoutBox!.width <= backBox!.x).toBeTruthy();

    const hasHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  }
});


async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill("operador");
  await page.getByLabel("Senha").fill(demoPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

async function createAndSyncCollection(
  page: Page,
  input: {
    month: string;
    year: string;
    donationsVoluntary: string;
    donationsReplacement: string;
    clinicallyFit: string;
    clinicallyUnfit: string;
    testedSamples: string;
    reactiveSamples: string;
    observation: string;
  },
) {
  await page.goto("/");
  await selectHomePeriod(page, input.month, input.year);
  await page.getByRole("button", { name: "Iniciar nova coleta" }).click();

  await page.getByLabel("Doações voluntárias/espontâneas").fill(input.donationsVoluntary);
  await page.getByLabel("Doações de reposição").fill(input.donationsReplacement);
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Candidatos aptos").fill(input.clinicallyFit);
  await page.getByLabel("Candidatos inaptos").fill(input.clinicallyUnfit);
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Amostras/bolsas testadas").fill(input.testedSamples);
  await page.getByLabel("Amostras/bolsas reagentes para um ou mais marcadores").fill(input.reactiveSamples);
  await page.getByLabel("Observação geral do período").fill(input.observation);
  await expect(page.getByText("Salvo neste dispositivo.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fechar e enviar" }).click();
  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Fechar e enviar" }).click();
  await expect(page).toHaveURL(/\/registros\//);

  await page.getByRole("link", { name: "Sincronização", exact: true }).click();
  const emptyPendingState = page.getByText("Nenhuma coleta fechada aguardando envio.");
  if ((await emptyPendingState.count()) === 0) {
    const selectAllCheckbox = page.getByLabel("Selecionar todos");
    await selectAllCheckbox.check();
    await page.getByRole("button", { name: "Sincronizar selecionados" }).click();
  }
  await expect(emptyPendingState).toBeVisible();
}

async function selectHomePeriod(page: Page, month: string, year: string) {
  await page.getByRole("textbox", { name: "Ano" }).click();
  await page.getByRole("option", { name: year }).click();
  await page.getByRole("textbox", { name: "Mês" }).click();
  await page.getByRole("option", { name: month }).click();
}
