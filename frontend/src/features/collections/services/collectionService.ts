import {
  buildValidationSummary,
  createInitialResponses,
  summarizeCatalogVersion,
} from "../../../domain/collection/catalogEngine";
import { submissionLocalRepository } from "../../../repositories/local/submissionLocalRepository";
import type {
  BootstrapPayload,
  CollectionResponseMap,
  LocalSubmissionRecord,
  MethodologyCatalog,
  ReportingPeriodContext,
} from "../../../types/submission";


function ensureCollectionContext(bootstrap: BootstrapPayload, period?: ReportingPeriodContext | null) {
  const reportingPeriod = period ?? bootstrap.reportingPeriod;
  if (!bootstrap.unit || !reportingPeriod) {
    throw new Error("Contexto demonstrativo indisponível.");
  }

  return {
    unit: bootstrap.unit,
    reportingPeriod,
  };
}

export const collectionService = {
  async getActiveCollection(bootstrap: BootstrapPayload, period?: ReportingPeriodContext | null) {
    const { unit, reportingPeriod } = ensureCollectionContext(bootstrap, period);
    return submissionLocalRepository.findActiveByContext(unit.id, reportingPeriod.id);
  },

  async getCollection(recordId: string) {
    return submissionLocalRepository.getRecordById(recordId);
  },

  buildInitialResponses(catalog: MethodologyCatalog, existingRecord: LocalSubmissionRecord | null) {
    return existingRecord?.responses ?? createInitialResponses(catalog);
  },

  buildValidationSummary(catalog: MethodologyCatalog, responses: CollectionResponseMap) {
    return buildValidationSummary(catalog, responses);
  },

  async startCollection(bootstrap: BootstrapPayload, catalog: MethodologyCatalog, period?: ReportingPeriodContext | null) {
    const { unit, reportingPeriod } = ensureCollectionContext(bootstrap, period);
    const existing = await submissionLocalRepository.findActiveByContext(unit.id, reportingPeriod.id);
    if (existing) {
      return existing;
    }

    const initialResponses = createInitialResponses(catalog);
    return submissionLocalRepository.createCollection({
      institutionId: bootstrap.institution.id,
      unitId: unit.id,
      reportingPeriodId: reportingPeriod.id,
      reportingPeriodLabel: reportingPeriod.label,
      cycleUuid: crypto.randomUUID(),
      responsibleUsername: bootstrap.user.username,
      responsibleDisplayName: bootstrap.user.fullName,
      responsibleRole: bootstrap.user.role,
      responses: initialResponses,
      validationSummary: buildValidationSummary(catalog, initialResponses),
      catalogVersionSummary: summarizeCatalogVersion(catalog),
    });
  },

  async updateReportingPeriod(recordId: string, reportingPeriod: ReportingPeriodContext) {
    return submissionLocalRepository.updateReportingPeriod(recordId, {
      reportingPeriodId: reportingPeriod.id,
      reportingPeriodLabel: reportingPeriod.label,
    });
  },

  async saveCollection(
    recordId: string,
    catalog: MethodologyCatalog,
    responses: CollectionResponseMap,
    generalObservation: string,
  ) {
    const validationSummary = this.buildValidationSummary(catalog, responses);
    return submissionLocalRepository.saveCollection({
      recordId,
      responses,
      generalObservation,
      validationSummary,
    });
  },

  async closeCollection(recordId: string, catalog: MethodologyCatalog, responses: CollectionResponseMap) {
    const validationSummary = this.buildValidationSummary(catalog, responses);
    if (!validationSummary.valid) {
      throw new Error("Existem inconsistências que impedem o fechamento.");
    }
    return submissionLocalRepository.closeCollection(recordId, validationSummary);
  },

  async reopenCollection(recordId: string) {
    return submissionLocalRepository.reopenCollection(recordId);
  },

  async deleteCollection(recordId: string) {
    return submissionLocalRepository.deleteLocalCollection(recordId);
  },
};
