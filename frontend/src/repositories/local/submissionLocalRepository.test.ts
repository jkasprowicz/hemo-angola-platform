import { beforeEach, describe, expect, it } from "vitest";

import { resetIndexedDbForTests } from "../../lib/storage/indexedDb";
import { submissionLocalRepository } from "./submissionLocalRepository";
import { demoBootstrap } from "../../test/demoBootstrap";
import { buildValidationSummary, summarizeCatalogVersion } from "../../domain/collection/catalogEngine";


describe("submissionLocalRepository", () => {
  beforeEach(async () => {
    await resetIndexedDbForTests();
  });

  it("saves a draft locally before any sync stage", async () => {
    const validationSummary = buildValidationSummary(demoBootstrap.catalog, {
      donacoes_voluntarias: 12,
      donacoes_reposicao: 15,
      candidatos_aptos: null,
      candidatos_inaptos: null,
      amostras_testadas: null,
      amostras_reagentes: null,
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
        donacoes_voluntarias: 12,
        donacoes_reposicao: 15,
        candidatos_aptos: null,
        candidatos_inaptos: null,
        amostras_testadas: null,
        amostras_reagentes: null,
      },
      validationSummary,
      catalogVersionSummary: summarizeCatalogVersion(demoBootstrap.catalog),
    });

    expect(record.collectionStatus).toBe("in_progress");
    expect(record.syncStatus).toBe("local_only");

    const allRecords = await submissionLocalRepository.listRecords();
    expect(allRecords).toHaveLength(1);
    expect(allRecords[0]?.collectionStatus).toBe("in_progress");
  });

  it("closes a draft into the sync queue with a stable submission uuid", async () => {
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
      responses: record.responses,
      generalObservation: "Livro demonstrativo",
      validationSummary,
    });

    const closed = await submissionLocalRepository.closeCollection(record.id, validationSummary);
    const eligibleQueue = await submissionLocalRepository.getEligibleQueueItems(new Date().toISOString());

    expect(closed.collectionStatus).toBe("closed");
    expect(closed.syncStatus).toBe("pending");
    expect(closed.submissionUuid).toBeTruthy();
    expect(eligibleQueue).toHaveLength(1);
  });

  it("reopens a closed local collection before the first sync", async () => {
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
      responses: record.responses,
      generalObservation: "Livro demonstrativo",
      validationSummary,
    });

    const closed = await submissionLocalRepository.closeCollection(record.id, validationSummary);
    const reopened = await submissionLocalRepository.reopenCollection(closed.id);

    expect(reopened.id).toBe(closed.id);
    expect(reopened.collectionStatus).toBe("in_progress");
    expect(reopened.syncStatus).toBe("local_only");
    expect(reopened.versionNumber).toBe(0);
  });
});
