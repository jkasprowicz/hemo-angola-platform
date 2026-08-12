import React from "react";
import { MantineProvider } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AppShellLayout } from "./AppShellLayout";
import { demoBootstrap } from "../../test/demoBootstrap";


vi.mock("../../hooks/useConnectivity", () => ({
  useConnectivity: () => ({
    isNavigatorOnline: true,
    isApiReachable: true,
    isEffectivelyOnline: true,
  }),
}));

vi.mock("../../services/authService", () => ({
  authService: {
    logout: vi.fn(async () => ({ detail: "Sessão encerrada com sucesso." })),
  },
}));

vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});


describe("AppShellLayout", () => {
  const queryClient = new QueryClient();

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("closes the mobile menu when a navigation item is clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter>
            <AppShellLayout bootstrap={demoBootstrap} />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    const burger = screen.getByLabelText("Abrir menu de navegação");
    fireEvent.click(burger);
    await waitFor(() => {
      expect(burger.querySelector('[data-opened="true"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Dashboard"));
    await waitFor(() => {
      expect(burger.querySelector('[data-opened="true"]')).toBeFalsy();
    });
  });

  it("closes the mobile menu when Escape is pressed", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter>
            <AppShellLayout bootstrap={demoBootstrap} />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByLabelText("Abrir menu de navegação"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByLabelText("Abrir menu de navegação")).toBeTruthy();
  });

  it("closes the mobile menu when the active item is clicked", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter initialEntries={["/"]}>
            <AppShellLayout bootstrap={demoBootstrap} />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByLabelText("Abrir menu de navegação"));
    fireEvent.click(screen.getByText("Início"));
    expect(screen.getByLabelText("Abrir menu de navegação")).toBeTruthy();
  });

  it("renders the HEMO-DATA brand in the application header", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter>
            <AppShellLayout bootstrap={demoBootstrap} />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("HEMO-DATA")).toBeTruthy();
    expect(screen.getByText("Plataforma de Indicadores Hemoterápicos")).toBeTruthy();
  });

  it("keeps logout on the same mobile header line and hides the subtitle", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MemoryRouter>
            <AppShellLayout bootstrap={demoBootstrap} />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Abrir menu de navegação")).toBeTruthy();
    expect(screen.getByText("HEMO-DATA")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
    expect(screen.queryByText("Plataforma de Indicadores Hemoterápicos")).toBeNull();
  });
});
