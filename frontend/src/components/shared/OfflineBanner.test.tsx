import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";

import { OfflineBanner } from "./OfflineBanner";


describe("OfflineBanner", () => {
  it("shows an offline warning in portuguese", () => {
    render(
      <MantineProvider>
        <OfflineBanner online={false} pendingCount={2} />
      </MantineProvider>,
    );

    expect(screen.getByText("Você está offline")).toBeTruthy();
    expect(screen.getByText(/Seu trabalho continuará salvo neste dispositivo/)).toBeTruthy();
  });
});
