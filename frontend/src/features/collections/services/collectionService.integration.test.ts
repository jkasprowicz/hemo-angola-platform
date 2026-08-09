import { beforeEach, describe, expect, it } from "vitest";

import { resetIndexedDbForTests } from "../../../lib/storage/indexedDb";
import { collectionService } from "./collectionService";
import { demoBootstrap } from "../../../test/demoBootstrap";


describe("collectionService integration", () => {
  beforeEach(async () => {
    await resetIndexedDbForTests();
  });

  it("saves draft and closes a valid collection", async () => {
    const record = await collectionService.startCollection(demoBootstrap, demoBootstrap.catalog);
    const saved = await collectionService.saveCollection(
      record.id,
      demoBootstrap.catalog,
      {
        donacoes_voluntarias: 320,
        donacoes_reposicao: 680,
        candidatos_aptos: 850,
        candidatos_inaptos: 150,
        amostras_testadas: 850,
        amostras_reagentes: 21,
      },
      "Livro demonstrativo",
    );

    const closed = await collectionService.closeCollection(saved.id, demoBootstrap.catalog, saved.responses);
    expect(closed.collectionStatus).toBe("closed");
    expect(closed.syncStatus).toBe("pending");
    expect(closed.versionNumber).toBe(1);
  });
});
