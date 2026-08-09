import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CollectionForm } from "./CollectionForm";
import { resetIndexedDbForTests } from "../../../lib/storage/indexedDb";
import { demoBootstrap } from "../../../test/demoBootstrap";
import { collectionService } from "../services/collectionService";

function getLastFieldByLabel(label: string) {
  const matches = screen.getAllByLabelText(label);
  return matches[matches.length - 1];
}

describe("CollectionForm", () => {
  beforeEach(async () => {
    await resetIndexedDbForTests();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders dynamic modules and reaches final review", async () => {
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

    expect(screen.getByText(/Os indicadores definitivos serão priorizados/)).toBeTruthy();
    expect(screen.getByLabelText("Doações voluntárias/espontâneas")).toBeTruthy();
    await user.type(screen.getByLabelText("Doações voluntárias/espontâneas"), "320");
    await user.type(screen.getByLabelText("Doações de reposição"), "680");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.type(screen.getByLabelText("Candidatos aptos"), "850");
    await user.type(screen.getByLabelText("Candidatos inaptos"), "150");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.type(screen.getByLabelText("Amostras/bolsas testadas"), "850");
    await user.type(screen.getByLabelText("Amostras/bolsas reagentes para um ou mais marcadores"), "21");
    expect(screen.getByText("Resumo da coleta")).toBeTruthy();
    expect(screen.getByText("Completude")).toBeTruthy();
    expect(screen.getByText("Observação geral do período")).toBeTruthy();
    expect(screen.getAllByText("Percentual de doações voluntárias").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Taxa de inaptidão clínica").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Taxa de reatividade").length).toBeGreaterThan(0);
    expect(screen.getByText(/Salvo neste dispositivo|Salvando neste dispositivo/)).toBeTruthy();
  });

  it("updates completion, indicators and close action immediately after numeric input", async () => {
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

    await user.type(screen.getByLabelText("Doações voluntárias/espontâneas"), "5");
    await user.type(screen.getByLabelText("Doações de reposição"), "5");
    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.type(screen.getByLabelText("Candidatos aptos"), "5");
    await user.type(screen.getByLabelText("Candidatos inaptos"), "5");

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    await user.type(getLastFieldByLabel("Amostras/bolsas testadas"), "5");
    await user.type(
      getLastFieldByLabel("Amostras/bolsas reagentes para um ou mais marcadores"),
      "5",
    );

    await waitFor(() => {
      const closeButton =
        screen.queryByRole("button", { name: "Fechar e enviar" }) ??
        screen.queryByRole("button", { name: "Fechar coleta" });
      expect(closeButton).toBeTruthy();
      expect(closeButton?.hasAttribute("disabled")).toBe(false);
    });
  });
});
