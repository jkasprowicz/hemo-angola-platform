import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetIndexedDbForTests } from "../storage/indexedDb";
import { submissionLocalRepository } from "../../repositories/local/submissionLocalRepository";
import { runSync } from "./syncEngine";
import { useSyncStore } from "./syncStore";
import { demoBootstrap } from "../../test/demoBootstrap";
import { buildValidationSummary, summarizeCatalogVersion } from "../../domain/collection/catalogEngine";


vi.mock("../../repositories/remote/syncRemoteRepository", () => ({
  syncRemoteRepository: {
    syncItems: vi.fn(async (items) => ({
      results: items.map((item: { record: { id: string } }) => ({
        localId: item.record.id,
        submissionUuid: "uuid-demo",
        versionNumber: 1,
        status: "received",
        syncedAt: "2026-08-08T00:00:00.000Z",
        idempotent: false,
      })),
    })),
  },
}));


describe("runSync", () => {
  beforeEach(async () => {
    await resetIndexedDbForTests();
    useSyncStore.getState().setPendingCount(0);
    useSyncStore.getState().setLastError(null);
  });

  it("syncs queued local records and clears pending count", async () => {
    const validationSummary = buildValidationSummary(demoBootstrap.catalog, {
      donacoes_voluntarias: 320,
      donacoes_reposicao: 680,
      candidatos_aptos: 850,
      candidatos_inaptos: 150,
      amostras_testadas: 850,
      amostras_reagentes: 21,
    });
    const record = await submissionLocalRepository.createCollection({
      cycleUuid: crypto.randomUUID(),
      responsibleUsername: "operador",
      responsibleDisplayName: "Operador Demo",
      responsibleRole: "operator",
      institutionId: 1,
      unitId: 1,
      reportingPeriodId: 1,
      reportingPeriodLabel: "Agosto/2026",
      collectionDate: "2026-08-10",
      responses: {
        donacoes_voluntarias: 320,
        donacoes_reposicao: 680,
        candidatos_aptos: 850,
        candidatos_inaptos: 150,
        amostras_testadas: 850,
        amostras_reagentes: 21,
      },
      validationSummary,
      catalogVersionSummary: summarizeCatalogVersion(demoBootstrap.catalog),
    });
    await submissionLocalRepository.saveCollection({
      recordId: record.id,
      responses: {
        donacoes_voluntarias: 320,
        donacoes_reposicao: 680,
        candidatos_aptos: 850,
        candidatos_inaptos: 150,
        amostras_testadas: 850,
        amostras_reagentes: 21,
      },
      generalObservation: "Origem demo",
      validationSummary,
    });
    await submissionLocalRepository.closeCollection(record.id, validationSummary);

    await runSync();

    expect(useSyncStore.getState().pendingCount).toBe(0);
    const items = await submissionLocalRepository.listRecords();
    expect(items[0]?.collectionStatus).toBe("received");
    expect(items[0]?.syncStatus).toBe("synced");
  });
});
