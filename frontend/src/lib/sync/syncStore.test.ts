import { describe, expect, it } from "vitest";

import { useSyncStore } from "./syncStore";


describe("useSyncStore", () => {
  it("updates pending count and last error", () => {
    useSyncStore.getState().setPendingCount(3);
    useSyncStore.getState().setLastError("Erro");

    expect(useSyncStore.getState().pendingCount).toBe(3);
    expect(useSyncStore.getState().lastError).toBe("Erro");
  });
});

