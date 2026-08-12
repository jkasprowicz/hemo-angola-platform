import React from "react";
import { MantineProvider } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { DashboardLayout } from "./DashboardLayout";
import { demoBootstrap } from "../../test/demoBootstrap";


const logoutMock = vi.hoisted(() => vi.fn(async () => ({ detail: "Sessão encerrada com sucesso." })));

vi.mock("../../services/authService", () => ({
  authService: {
    logout: logoutMock,
  },
}));

vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});


function renderDashboardLayout(initialEntry = "/dashboard") {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<DashboardLayout bootstrap={demoBootstrap} />}>
              <Route path="/dashboard" element={<div>Conteúdo do dashboard</div>} />
            </Route>
            <Route path="/inicio" element={<div>Tela inicial</div>} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}


describe("DashboardLayout", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders dedicated analytical header without operational sidebar", () => {
    renderDashboardLayout();

    expect(screen.getByText("Dashboard de Indicadores Hemoterápicos")).toBeTruthy();
    expect(screen.getByText("Conteúdo do dashboard")).toBeTruthy();
    expect(screen.queryByText("Coleta")).toBeNull();
    expect(screen.queryByText("Sincronização")).toBeNull();
  });

  it("navigates back to the operational system", async () => {
    renderDashboardLayout();

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao sistema" }));
    expect(await screen.findByText("Tela inicial")).toBeTruthy();
  });

  it("executes logout from the dashboard", async () => {
    renderDashboardLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByText("Login")).toBeTruthy();
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("uses stacked responsive header controls on mobile", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    renderDashboardLayout();

    expect(screen.getByRole("button", { name: "Sistema" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Voltar ao sistema" })).toBeNull();
  });
});
