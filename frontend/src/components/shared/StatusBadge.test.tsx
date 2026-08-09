import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";

import { CollectionStatusBadge, SyncStatusBadge } from "./StatusBadge";


describe("StatusBadge", () => {
  it("renders the portuguese label for a collection ready for review", () => {
    render(
      <MantineProvider>
        <CollectionStatusBadge status="ready_for_review" />
      </MantineProvider>,
    );

    expect(screen.getByText("Pronta para revisão")).toBeTruthy();
  });

  it("renders the portuguese label for a pending sync record", () => {
    render(
      <MantineProvider>
        <SyncStatusBadge status="pending" />
      </MantineProvider>,
    );

    expect(screen.getByText("Aguardando envio")).toBeTruthy();
  });
});
