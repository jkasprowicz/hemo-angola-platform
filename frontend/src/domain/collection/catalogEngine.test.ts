import { describe, expect, it } from "vitest";

import {
  buildValidationSummary,
  calculateCollectionCompletion,
  calculateIndicators,
  createInitialResponses,
} from "./catalogEngine";
import { demoBootstrap } from "../../test/demoBootstrap";

describe("catalogEngine", () => {
  it("creates initial responses from the expanded catalog", () => {
    const responses = createInitialResponses(demoBootstrap.catalog);
    expect(Object.keys(responses)).toContain("donacoes_voluntarias");
    expect(Object.keys(responses)).toContain("exame_sifilis_testadas");
    expect(responses.amostras_reagentes).toBeNull();
  });

  it("calculates indicators safely from derived laboratory totals", () => {
    const indicators = calculateIndicators(demoBootstrap.catalog, {
      candidatos_convocados: 1000,
      candidatos_compareceram: 740,
      donacoes_voluntarias: 320,
      donacoes_reposicao: 680,
      candidatos_aptos: 850,
      candidatos_inaptos: 150,
      exame_sifilis_testadas: 300,
      exame_sifilis_reagentes: 6,
      exame_hiv_testadas: 300,
      exame_hiv_reagentes: 5,
      exame_hbv_testadas: 250,
      exame_hbv_reagentes: 10,
    });

    expect(indicators.find((indicator) => indicator.code === "percentual_doacoes_voluntarias")?.totalValue).toBe(1000);
    expect(indicators.find((indicator) => indicator.code === "percentual_doacoes_voluntarias")?.value).toBe(32);
    expect(indicators.find((indicator) => indicator.code === "taxa_comparecimento")?.value).toBe(74);
    expect(indicators.find((indicator) => indicator.code === "taxa_inaptidao_clinica")?.value).toBe(15);
    expect(indicators.find((indicator) => indicator.code === "taxa_reatividade")?.value).toBeCloseTo(2.47, 2);
    expect(indicators.find((indicator) => indicator.code === "taxa_reatividade_hiv")?.value).toBeCloseTo(1.67, 2);
  });

  it("computes completeness by module", () => {
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
    expect(summary.completenessByModule.find((module) => module.moduleCode === "clinical_screening")?.percentage).toBe(50);
    expect(summary.completenessByModule.find((module) => module.moduleCode === "collection_operations")?.percentage).toBe(100);
    expect(summary.completenessByModule.find((module) => module.moduleCode === "laboratory_screening")?.percentage).toBe(100);
  });

  it("normalizes numeric strings, treats zero as valid, and validates exam consistency", () => {
    const completion = calculateCollectionCompletion(demoBootstrap.catalog, {
      donacoes_voluntarias: "0",
      donacoes_reposicao: "5",
      candidatos_aptos: "5",
      candidatos_inaptos: "0",
      exame_sifilis_testadas: "5",
      exame_sifilis_reagentes: "1",
      exame_hiv_testadas: "0",
      exame_hiv_reagentes: "0",
      exame_hbv_testadas: "0",
      exame_hbv_reagentes: "0",
    });

    expect(completion.completedRequiredFields).toBe(4);
    expect(completion.requiredFields).toBe(4);
    expect(completion.overallCompletionPercentage).toBe(100);
    expect(completion.missingRequiredFields).toEqual([]);

    const validation = buildValidationSummary(demoBootstrap.catalog, {
      donacoes_voluntarias: 5,
      donacoes_reposicao: 5,
      candidatos_aptos: 5,
      candidatos_inaptos: 0,
      exame_sifilis_testadas: 10,
      exame_sifilis_reagentes: 11,
    });

    expect(validation.inconsistencies.some((issue) => issue.includes("sifilis"))).toBe(true);
  });
});
