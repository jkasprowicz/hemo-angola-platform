import { describe, expect, it } from "vitest";

import {
  buildValidationSummary,
  calculateCollectionCompletion,
  calculateIndicators,
  createInitialResponses,
} from "./catalogEngine";
import { demoBootstrap } from "../../test/demoBootstrap";


describe("catalogEngine", () => {
  it("creates initial responses from the catalog", () => {
    const responses = createInitialResponses(demoBootstrap.catalog);
    expect(Object.keys(responses)).toContain("donacoes_voluntarias");
    expect(responses.amostras_reagentes).toBeNull();
  });

  it("calculates ratio-based indicators safely", () => {
    const indicators = calculateIndicators(demoBootstrap.catalog, {
      donacoes_voluntarias: 320,
      donacoes_reposicao: 680,
      candidatos_aptos: 850,
      candidatos_inaptos: 150,
      amostras_testadas: 850,
      amostras_reagentes: 21,
    });

    expect(indicators.find((indicator) => indicator.code === "percentual_doacoes_voluntarias")?.totalValue).toBe(1000);
    expect(indicators.find((indicator) => indicator.code === "percentual_doacoes_voluntarias")?.value).toBe(32);
    expect(indicators.find((indicator) => indicator.code === "taxa_inaptidao_clinica")?.value).toBe(15);
    expect(indicators.find((indicator) => indicator.code === "taxa_reatividade")?.value).toBeCloseTo(2.47, 2);
  });

  it("computes completeness and validation summary by module", () => {
    const summary = buildValidationSummary(demoBootstrap.catalog, {
      donacoes_voluntarias: 10,
      donacoes_reposicao: 20,
      candidatos_aptos: null,
      candidatos_inaptos: null,
      amostras_testadas: null,
      amostras_reagentes: null,
    });

    expect(summary.valid).toBe(false);
    expect(summary.missingRequiredFields).toContain("Candidatos aptos");
    expect(summary.completenessByModule.find((module) => module.moduleCode === "donation_capture")?.percentage).toBe(100);
    expect(summary.completenessByModule.find((module) => module.moduleCode === "laboratory_screening")?.percentage).toBe(0);
  });

  it("normalizes numeric strings and treats zero as a valid collected value", () => {
    const completion = calculateCollectionCompletion(demoBootstrap.catalog, {
      donacoes_voluntarias: "0",
      donacoes_reposicao: "5",
      candidatos_aptos: "5",
      candidatos_inaptos: "0",
      amostras_testadas: "5",
      amostras_reagentes: "5",
    });

    expect(completion.completedRequiredFields).toBe(6);
    expect(completion.requiredFields).toBe(6);
    expect(completion.overallCompletionPercentage).toBe(100);
    expect(completion.missingRequiredFields).toEqual([]);
  });
});
