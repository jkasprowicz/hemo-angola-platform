import React from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DashboardPage } from "./DashboardPage";
import { demoBootstrap } from "../../../test/demoBootstrap";
import type { DashboardPayload } from "../../../types/api";


const dashboardServiceMock = vi.hoisted(() => ({
  getDashboard: vi.fn(),
}));

const useMediaQueryMock = vi.hoisted(() => vi.fn());

vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useMediaQuery: useMediaQueryMock,
  };
});

vi.mock("../../../hooks/useSession", () => ({
  useSession: () => ({
    data: { authenticated: true },
    isLoading: false,
  }),
}));

vi.mock("../../../hooks/useBootstrap", () => ({
  useBootstrap: () => ({
    data: demoBootstrap,
    isLoading: false,
  }),
}));

vi.mock("../../../services/dashboardService", () => ({
  dashboardService: dashboardServiceMock,
}));


const dashboardPayload: DashboardPayload = {
  filters: {
    unit_id: 1,
    period_from: 1,
    period_to: 2,
  },
  summary: {
    collections_received: 2,
    period_analyzed: "Janeiro/2026 – Fevereiro/2026",
    last_updated: "2026-08-08T21:40:00Z",
    unit: {
      id: 1,
      name: "Unidade Demonstrativa",
    },
    workflow_note:
      "O dashboard MVP considera dados tecnicamente recebidos pelo servidor. O aceite institucional definitivo permanece TO-BE.",
  },
  indicators: [
    {
      code: "percentual_doacoes_voluntarias",
      name: "Percentual de doações voluntárias",
      unit: "%",
      value: 42.86,
      reference_note: "Sem referência definida",
      base_data: [
        { label: "Voluntárias", field: "donacoes_voluntarias", value: 300 },
        { label: "Reposição", field: "donacoes_reposicao", value: 400 },
      ],
    },
    {
      code: "taxa_inaptidao_clinica",
      name: "Taxa de inaptidão clínica",
      unit: "%",
      value: 12.5,
      reference_note: "Sem referência definida",
      base_data: [
        { label: "Aptos", field: "candidatos_aptos", value: 350 },
        { label: "Inaptos", field: "candidatos_inaptos", value: 50 },
      ],
    },
    {
      code: "taxa_reatividade",
      name: "Taxa de reatividade laboratorial",
      unit: "%",
      value: 2.0,
      reference_note: "Sem referência definida",
      base_data: [
        { label: "Testadas", field: "amostras_testadas", value: 400 },
        { label: "Reagentes", field: "amostras_reagentes", value: 8 },
      ],
    },
  ],
  series: [
    {
      indicator_code: "percentual_doacoes_voluntarias",
      indicator_name: "Percentual de doações voluntárias",
      unit: "%",
      points: [
        {
          reporting_period_id: 1,
          label: "Janeiro/2026",
          reference_year: 2026,
          reference_month: 1,
          value: 40,
          base_data: [
            { label: "Voluntárias", field: "donacoes_voluntarias", value: 100 },
            { label: "Reposição", field: "donacoes_reposicao", value: 150 },
          ],
          trace_records: [],
        },
        {
          reporting_period_id: 2,
          label: "Fevereiro/2026",
          reference_year: 2026,
          reference_month: 2,
          value: 44.44,
          base_data: [
            { label: "Voluntárias", field: "donacoes_voluntarias", value: 200 },
            { label: "Reposição", field: "donacoes_reposicao", value: 250 },
          ],
          trace_records: [],
        },
      ],
    },
    {
      indicator_code: "taxa_inaptidao_clinica",
      indicator_name: "Taxa de inaptidão clínica",
      unit: "%",
      points: [
        {
          reporting_period_id: 1,
          label: "Janeiro/2026",
          reference_year: 2026,
          reference_month: 1,
          value: 10,
          base_data: [],
          trace_records: [],
        },
        {
          reporting_period_id: 2,
          label: "Fevereiro/2026",
          reference_year: 2026,
          reference_month: 2,
          value: 14,
          base_data: [],
          trace_records: [],
        },
      ],
    },
    {
      indicator_code: "taxa_reatividade",
      indicator_name: "Taxa de reatividade laboratorial",
      unit: "%",
      points: [
        {
          reporting_period_id: 1,
          label: "Janeiro/2026",
          reference_year: 2026,
          reference_month: 1,
          value: 1.5,
          base_data: [],
          trace_records: [],
        },
        {
          reporting_period_id: 2,
          label: "Fevereiro/2026",
          reference_year: 2026,
          reference_month: 2,
          value: 2.5,
          base_data: [],
          trace_records: [],
        },
      ],
    },
  ],
  table: [
    {
      reporting_period_id: 1,
      label: "Janeiro/2026",
      reference_year: 2026,
      reference_month: 1,
      donacoes_voluntarias: 100,
      donacoes_reposicao: 150,
      percentual_doacoes_voluntarias: 40,
      candidatos_aptos: 180,
      candidatos_inaptos: 20,
      taxa_inaptidao_clinica: 10,
      amostras_testadas: 200,
      amostras_reagentes: 3,
      taxa_reatividade: 1.5,
      trace: { submission_count: 1, last_updated: "2026-08-08T21:40:00Z", records: [] },
    },
    {
      reporting_period_id: 2,
      label: "Fevereiro/2026",
      reference_year: 2026,
      reference_month: 2,
      donacoes_voluntarias: 200,
      donacoes_reposicao: 250,
      percentual_doacoes_voluntarias: 44.44,
      candidatos_aptos: 170,
      candidatos_inaptos: 30,
      taxa_inaptidao_clinica: 15,
      amostras_testadas: 200,
      amostras_reagentes: 5,
      taxa_reatividade: 2.5,
      trace: { submission_count: 1, last_updated: "2026-08-08T21:40:00Z", records: [] },
    },
  ],
  empty: false,
};


function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/registros" element={<div>Registros filtrados</div>} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}


describe("DashboardPage", () => {
  beforeEach(() => {
    dashboardServiceMock.getDashboard.mockResolvedValue(dashboardPayload);
    useMediaQueryMock.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders loading then summary cards and indicator cards", async () => {
    renderDashboard();

    expect(screen.getByText("Carregando dados consolidados…")).toBeTruthy();
    const contextBar = await screen.findByTestId("dashboard-context-bar");
    expect(contextBar).toBeTruthy();
    expect(within(contextBar).getByText("Coletas")).toBeTruthy();
    expect(within(contextBar).getByText("2")).toBeTruthy();
    expect(screen.getAllByText("Percentual de doações voluntárias").length).toBeGreaterThan(0);
    expect(screen.getByText("42,9%")).toBeTruthy();
    expect(screen.getAllByText("Sem referência definida").length).toBeGreaterThan(0);
    expect(screen.getByTestId("dashboard-view-overview")).toBeTruthy();
    expect(screen.getByText("Volume analisado")).toBeTruthy();
  });

  it("renders error state and allows retry", async () => {
    dashboardServiceMock.getDashboard.mockRejectedValueOnce(new Error("Falha"));
    renderDashboard();

    expect(await screen.findByTestId("dashboard-error-state")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => {
      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("renders empty state", async () => {
    dashboardServiceMock.getDashboard.mockResolvedValueOnce({
      ...dashboardPayload,
      empty: true,
      summary: { ...dashboardPayload.summary, collections_received: 0, period_analyzed: "Sem dados" },
      table: [],
      series: [],
    });
    renderDashboard();

    expect(await screen.findByTestId("dashboard-empty-state")).toBeTruthy();
  });

  it("updates filters and requests a new payload", async () => {
    renderDashboard();

    await screen.findByTestId("dashboard-context-bar");
    fireEvent.click(screen.getByTestId("dashboard-filter-period-from"));
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Agosto/2026" }));

    await waitFor(() => {
      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => {
        expect(dashboardServiceMock.getDashboard).toHaveBeenLastCalledWith(
          expect.objectContaining({ periodFrom: 8 }),
        );
    });
  });

  it("navigates to filtered records when clicking a period link", async () => {
    renderDashboard();

    await screen.findByTestId("dashboard-view-switcher");
    fireEvent.click(screen.getByRole("radio", { name: "Consolidados" }));
    await screen.findByText("Dados consolidados");
    fireEvent.click(screen.getByTestId("dashboard-open-period-1"));
    expect(await screen.findByText("Registros filtrados")).toBeTruthy();
  });

  it("switches between overview, trends and consolidated views", async () => {
    renderDashboard();

    expect(await screen.findByTestId("dashboard-view-overview")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Tendências" }));
    expect(await screen.findByTestId("dashboard-view-trends")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-view-overview")).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Consolidados" }));
    expect(await screen.findByTestId("dashboard-view-consolidated")).toBeTruthy();
    expect(screen.getByText("Dados consolidados")).toBeTruthy();
  });

  it("renders compact mobile filters with apply action below the fields", async () => {
    useMediaQueryMock.mockReturnValue(true);
    renderDashboard();

    await screen.findByTestId("dashboard-context-bar");
    expect(screen.getByText("Painel hemoterápico")).toBeTruthy();
    const mobileActions = screen.getByTestId("dashboard-filter-actions-mobile");
    expect(mobileActions).toBeTruthy();
    expect(within(mobileActions).getByRole("button", { name: "Aplicar filtros" })).toBeTruthy();
  });
});
