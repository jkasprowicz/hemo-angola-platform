import React from "react";
import { MantineProvider } from "@mantine/core";
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


describe("AppShellLayout", () => {
  const queryClient = new QueryClient();

  afterEach(() => {
    cleanup();
    queryClient.clear();
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
});
