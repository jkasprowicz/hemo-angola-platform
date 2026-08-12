import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionForm } from "./CollectionForm";
import { resetIndexedDbForTests } from "../../../lib/storage/indexedDb";
import { demoBootstrap } from "../../../test/demoBootstrap";
import { collectionService } from "../services/collectionService";

function getLastFieldByLabel(label: string) {
  const matches = screen.getAllByLabelText(label);
  return matches[matches.length - 1];
}

function mockMobileViewport(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("CollectionForm", () => {
  beforeEach(async () => {
    await resetIndexedDbForTests();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the expanded instrument and reaches the review step", async () => {
    const user = userEvent.setup();
    const record = await collectionService.startCollection(demoBootstrap, demoBootstrap.catalog);
    render(
      <MantineProvider>
        <CollectionForm
          bootstrap={demoBootstrap}
          existingRecord={record}
          onClosed={() => undefined}
          onSavedAndExit={() => undefined}
        />
      </MantineProvider>,
    );

    expect(screen.getByText(/Configuração demonstrativa/)).toBeTruthy();
    await user.type(getLastFieldByLabel("Doações voluntárias/espontâneas"), "320");
    await user.type(getLastFieldByLabel("Doações de reposição"), "680");
    await user.type(getLastFieldByLabel("Candidatos aptos"), "850");
    await user.type(getLastFieldByLabel("Candidatos inaptos"), "150");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.type(getLastFieldByLabel("Sífilis Amostras testadas"), "300");
    await user.type(getLastFieldByLabel("Sífilis Amostras reagentes"), "6");
    await user.type(getLastFieldByLabel("HIV Amostras testadas"), "300");
    await user.type(getLastFieldByLabel("HIV Amostras reagentes"), "5");
    await user.type(getLastFieldByLabel("Hepatite B Amostras testadas"), "250");
    await user.type(getLastFieldByLabel("Hepatite B Amostras reagentes"), "10");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    expect(screen.getByText("Resumo da coleta")).toBeTruthy();
    expect(screen.getByText("Estado por módulo")).toBeTruthy();
    expect(screen.getByText("Leituras derivadas e volumes principais")).toBeTruthy();
    expect(screen.getAllByText("Percentual de doações voluntárias").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Taxa de inaptidão clínica").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Taxa de reatividade").length).toBeGreaterThan(0);
  });

  it("enables close action after all required base fields are filled", async () => {
    const user = userEvent.setup();
    const record = await collectionService.startCollection(demoBootstrap, demoBootstrap.catalog);
    render(
      <MantineProvider>
        <CollectionForm
          bootstrap={demoBootstrap}
          existingRecord={record}
          onClosed={() => undefined}
          onSavedAndExit={() => undefined}
        />
      </MantineProvider>,
    );

    await user.type(getLastFieldByLabel("Doações voluntárias/espontâneas"), "5");
    await user.type(getLastFieldByLabel("Doações de reposição"), "5");
    await user.type(getLastFieldByLabel("Candidatos aptos"), "5");
    await user.type(getLastFieldByLabel("Candidatos inaptos"), "5");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.type(getLastFieldByLabel("Sífilis Amostras testadas"), "5");
    await user.type(getLastFieldByLabel("Sífilis Amostras reagentes"), "1");
    await user.type(getLastFieldByLabel("HIV Amostras testadas"), "5");
    await user.type(getLastFieldByLabel("HIV Amostras reagentes"), "0");
    await user.type(getLastFieldByLabel("Hepatite B Amostras testadas"), "5");
    await user.type(getLastFieldByLabel("Hepatite B Amostras reagentes"), "0");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    await waitFor(() => {
      const closeButton =
        screen.queryByRole("button", { name: "Fechar e enviar" }) ??
        screen.queryByRole("button", { name: "Fechar coleta" });
      expect(closeButton).toBeTruthy();
      expect(closeButton?.hasAttribute("disabled")).toBe(false);
    });
  });

  it("shows pending guidance and stacked matrix inputs on mobile", async () => {
    mockMobileViewport(true);
    const user = userEvent.setup();
    const record = await collectionService.startCollection(demoBootstrap, demoBootstrap.catalog);
    render(
      <MantineProvider>
        <CollectionForm
          bootstrap={demoBootstrap}
          existingRecord={record}
          onClosed={() => undefined}
          onSavedAndExit={() => undefined}
        />
      </MantineProvider>,
    );

    expect(screen.getByText(/Pendências desta etapa/)).toBeTruthy();
    expect(screen.getByText(/obrigatórios pendentes nesta etapa/)).toBeTruthy();

    await user.type(getLastFieldByLabel("Doações voluntárias/espontâneas"), "5");
    await user.type(getLastFieldByLabel("Doações de reposição"), "5");
    await user.type(getLastFieldByLabel("Candidatos aptos"), "5");
    await user.type(getLastFieldByLabel("Candidatos inaptos"), "0");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.click(screen.getByRole("button", { name: "Próximo" }));

    expect(screen.queryByText("Categoria")).toBeNull();
    expect(screen.getByText("Sífilis")).toBeTruthy();
    expect(screen.getByText("Amostras testadas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeTruthy();
  });
});
