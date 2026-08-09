import type { LocalSubmissionRecord, ValidationSummary } from "../../types/submission";


export function getValidationCompletion(summary: ValidationSummary) {
  return {
    completedRequiredFields: summary.completedRequiredFields,
    requiredFields: summary.requiredFields,
    overallCompletionPercentage: summary.overallCompletionPercentage,
  };
}

export function getRecordCompletion(record: LocalSubmissionRecord | null) {
  if (!record) {
    return {
      completedRequiredFields: 0,
      requiredFields: 0,
      overallCompletionPercentage: 0,
    };
  }

  return getValidationCompletion(record.validationSummary);
}
