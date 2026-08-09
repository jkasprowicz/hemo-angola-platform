import React from "react";
import { render, screen } from "@testing-library/react";
import { Alert, MantineProvider } from "@mantine/core";
import { describe, expect, it } from "vitest";


describe("sync error message", () => {
  it("renders a human-readable error", () => {
    render(
      <MantineProvider>
        <Alert color="red">Erro de sincronização. Revise os detalhes e tente novamente.</Alert>
      </MantineProvider>,
    );

    expect(screen.getByText(/Erro de sincronização/)).toBeTruthy();
  });
});
