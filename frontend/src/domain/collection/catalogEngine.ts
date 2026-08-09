import type {
  CollectionModuleDefinition,
  CollectionResponseMap,
  CollectionResponseValue,
  CollectionVariableDefinition,
  DerivedIndicatorValue,
  IndicatorDefinition,
  MethodologyCatalog,
  ModuleCompleteness,
  ValidationSummary,
} from "../../types/submission";

const derivedTotalLabels: Record<string, string> = {
  donation_capture: "Total de doações",
  clinical_screening: "Total de candidatos",
};

function toNumber(value: CollectionResponseValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeResponseValue(
  variable: CollectionVariableDefinition,
  value: CollectionResponseValue | undefined,
): CollectionResponseValue {
  if (value === undefined || value === null) {
    return variable.variable_type === "text" ? "" : null;
  }

  if (variable.variable_type === "text" || variable.variable_type === "select") {
    return String(value);
  }

  if (variable.variable_type === "boolean") {
    return typeof value === "boolean" ? value : null;
  }

  return toNumber(value);
}

export function normalizeResponseMap(
  catalog: MethodologyCatalog,
  responses: CollectionResponseMap,
): CollectionResponseMap {
  return catalog.variables.reduce<CollectionResponseMap>((normalized, variable) => {
    normalized[variable.code] = normalizeResponseValue(variable, responses[variable.code]);
    return normalized;
  }, {});
}

export function getSortedModules(catalog: MethodologyCatalog): CollectionModuleDefinition[] {
  return [...catalog.modules].sort((left, right) => left.display_order - right.display_order);
}

export function getVariablesForModule(
  catalog: MethodologyCatalog,
  moduleCode: string,
): CollectionVariableDefinition[] {
  return catalog.variables
    .filter((variable) => variable.module_code === moduleCode && variable.active)
    .sort((left, right) => left.display_order - right.display_order);
}

export function isValueFilled(variable: CollectionVariableDefinition, value: CollectionResponseValue) {
  if (value === null || value === undefined) {
    return false;
  }

  if (variable.variable_type === "text" || variable.variable_type === "select") {
    return String(value).trim().length > 0;
  }

  if (variable.variable_type === "boolean") {
    return typeof value === "boolean";
  }

  return toNumber(value) !== null;
}

export function createInitialResponses(catalog: MethodologyCatalog): CollectionResponseMap {
  return catalog.variables.reduce<CollectionResponseMap>((responses, variable) => {
    responses[variable.code] = variable.variable_type === "text" ? "" : null;
    return responses;
  }, {});
}

export function calculateCompleteness(
  catalog: MethodologyCatalog,
  responses: CollectionResponseMap,
): ModuleCompleteness[] {
  return getSortedModules(catalog).map((module) => {
    const requiredVariables = getVariablesForModule(catalog, module.code).filter((variable) => variable.required);
    const completedRequiredFields = requiredVariables.filter((variable) =>
      isValueFilled(variable, responses[variable.code]),
    ).length;
    const requiredFields = requiredVariables.length;
    const percentage =
      requiredFields === 0 ? 100 : Math.round((completedRequiredFields / requiredFields) * 100);

    return {
      moduleCode: module.code,
      moduleName: module.name,
      requiredFields,
      completedRequiredFields,
      percentage,
      isComplete: requiredFields === 0 || completedRequiredFields === requiredFields,
    };
  });
}

export function calculateOverallCompletion(completenessByModule: ModuleCompleteness[]) {
  const requiredFields = completenessByModule.reduce((total, module) => total + module.requiredFields, 0);
  const completedRequiredFields = completenessByModule.reduce(
    (total, module) => total + module.completedRequiredFields,
    0,
  );
  const overallCompletionPercentage =
    requiredFields === 0 ? 100 : Math.round((completedRequiredFields / requiredFields) * 100);

  return {
    requiredFields,
    completedRequiredFields,
    overallCompletionPercentage,
  };
}

export function calculateCollectionCompletion(
  catalog: MethodologyCatalog,
  responses: CollectionResponseMap,
) {
  const normalizedResponses = normalizeResponseMap(catalog, responses);
  const completenessByModule = calculateCompleteness(catalog, normalizedResponses);
  const overallCompletion = calculateOverallCompletion(completenessByModule);
  const missingRequiredFields = catalog.variables
    .filter((variable) => variable.required && !isValueFilled(variable, normalizedResponses[variable.code]))
    .map((variable) => variable.name);

  return {
    completenessByModule,
    missingRequiredFields,
    ...overallCompletion,
  };
}

export function calculateIndicators(
  catalog: MethodologyCatalog,
  responses: CollectionResponseMap,
): DerivedIndicatorValue[] {
  const normalizedResponses = normalizeResponseMap(catalog, responses);
  const moduleMap = new Map(catalog.modules.map((module) => [module.code, module]));
  return catalog.indicators.map((indicator: IndicatorDefinition) => {
    const numeratorValue = toNumber(normalizedResponses[indicator.numerator_variable_code]);
    const denominatorValue = toNumber(normalizedResponses[indicator.denominator_variable_code]);
    const totalValue =
      indicator.formula_kind === "share_of_sum_percentage" &&
      numeratorValue !== null &&
      denominatorValue !== null
        ? numeratorValue + denominatorValue
        : null;
    let value: number | null = null;

    if (
      indicator.formula_kind === "ratio_percentage" &&
      numeratorValue !== null &&
      denominatorValue !== null &&
      denominatorValue > 0
    ) {
      value = Number(((numeratorValue / denominatorValue) * 100).toFixed(2));
    }

    if (
      indicator.formula_kind === "share_of_sum_percentage" &&
      numeratorValue !== null &&
      denominatorValue !== null &&
      numeratorValue + denominatorValue > 0
    ) {
      value = Number(((numeratorValue / (numeratorValue + denominatorValue)) * 100).toFixed(2));
    }

    return {
      code: indicator.code,
      name: indicator.name,
      moduleCode: indicator.module_code,
      moduleName: moduleMap.get(indicator.module_code)?.name ?? indicator.module_code,
      dimension: indicator.dimension,
      unit: indicator.unit,
      formulaLabel: indicator.formula_label,
      numeratorCode: indicator.numerator_variable_code,
      denominatorCode: indicator.denominator_variable_code,
      numeratorValue,
      denominatorValue,
      totalValue,
      totalLabel: derivedTotalLabels[indicator.module_code] ?? null,
      value,
      version: indicator.version,
      interpretation: indicator.interpretation,
      isDemo: indicator.is_demo,
    };
  });
}

export function buildValidationSummary(
  catalog: MethodologyCatalog,
  responses: CollectionResponseMap,
): ValidationSummary {
  const normalizedResponses = normalizeResponseMap(catalog, responses);
  const missingRequiredFields: string[] = [];
  const inconsistencies: string[] = [];

  for (const variable of catalog.variables) {
    const value = normalizedResponses[variable.code];

    if (variable.required && !isValueFilled(variable, value)) {
      missingRequiredFields.push(variable.name);
      continue;
    }

    if (!isValueFilled(variable, value)) {
      continue;
    }

    if (variable.variable_type === "select" && variable.select_options.length > 0) {
      if (!variable.select_options.includes(String(value))) {
        inconsistencies.push(`${variable.name}: selecione uma opção válida.`);
      }
      continue;
    }

    if (variable.variable_type === "boolean") {
      if (typeof value !== "boolean") {
        inconsistencies.push(`${variable.name}: informe verdadeiro ou falso.`);
      }
      continue;
    }

    if (variable.variable_type === "integer" || variable.variable_type === "decimal") {
      const numericValue = toNumber(value);
      if (numericValue === null) {
        inconsistencies.push(`${variable.name}: informe um valor numérico válido.`);
        continue;
      }

      const minValue = variable.min_value === null ? null : Number(variable.min_value);
      const maxValue = variable.max_value === null ? null : Number(variable.max_value);

      if (minValue !== null && numericValue < minValue) {
        inconsistencies.push(`${variable.name}: informe valor maior ou igual a ${minValue}.`);
      }
      if (maxValue !== null && numericValue > maxValue) {
        inconsistencies.push(`${variable.name}: informe valor menor ou igual a ${maxValue}.`);
      }
    }
  }

  const completion = calculateCollectionCompletion(catalog, normalizedResponses);
  const calculatedIndicators = calculateIndicators(catalog, normalizedResponses);

  const donationVoluntary = toNumber(normalizedResponses.donacoes_voluntarias);
  const donationReplacement = toNumber(normalizedResponses.donacoes_reposicao);
  if (
    donationVoluntary !== null &&
    donationReplacement !== null &&
    donationVoluntary + donationReplacement <= 0
  ) {
    inconsistencies.push("Doação e captação: o total de doações deve ser maior que zero.");
  }

  const clinicalEligible = toNumber(normalizedResponses.candidatos_aptos);
  const clinicalIneligible = toNumber(normalizedResponses.candidatos_inaptos);
  if (
    clinicalEligible !== null &&
    clinicalIneligible !== null &&
    clinicalEligible + clinicalIneligible <= 0
  ) {
    inconsistencies.push("Triagem clínica: o total de candidatos deve ser maior que zero.");
  }

  const testedSamples = toNumber(normalizedResponses.amostras_testadas);
  const reactiveSamples = toNumber(normalizedResponses.amostras_reagentes);
  if (
    testedSamples !== null &&
    reactiveSamples !== null &&
    reactiveSamples > testedSamples
  ) {
    inconsistencies.push("Triagem laboratorial: amostras reagentes não podem exceder amostras testadas.");
  }

  for (const indicator of calculatedIndicators) {
    if (indicator.numeratorValue !== null && indicator.denominatorValue === 0) {
      inconsistencies.push(`${indicator.name}: o denominador não pode ser zero.`);
    }
    if (
      indicator.totalValue !== null &&
      indicator.totalValue <= 0 &&
      indicator.totalLabel !== null
    ) {
      inconsistencies.push(`${indicator.name}: ${indicator.totalLabel.toLowerCase()} deve ser maior que zero.`);
    }
  }

  return {
    valid: missingRequiredFields.length === 0 && inconsistencies.length === 0,
    missingRequiredFields,
    inconsistencies,
    completeModules: completion.completenessByModule.filter((module) => module.isComplete).map((module) => module.moduleName),
    incompleteModules: completion.completenessByModule.filter((module) => !module.isComplete).map((module) => module.moduleName),
    completenessByModule: completion.completenessByModule,
    requiredFields: completion.requiredFields,
    completedRequiredFields: completion.completedRequiredFields,
    overallCompletionPercentage: completion.overallCompletionPercentage,
    calculatedIndicators,
  };
}

export function summarizeCatalogVersion(catalog: MethodologyCatalog) {
  const modules = getSortedModules(catalog).map((module) => `${module.code}@${module.version}`);
  return modules.join(", ");
}
