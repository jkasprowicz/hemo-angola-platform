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

function getDefaultCollectionDate(reportingPeriod: ReportingPeriodContext) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  if (todayIso >= reportingPeriod.start_date && todayIso <= reportingPeriod.end_date) {
    return todayIso;
  }

  return reportingPeriod.start_date;
}

export function isCollectionDateWithinPeriod(collectionDate: string, reportingPeriod: ReportingPeriodContext) {
  return collectionDate >= reportingPeriod.start_date && collectionDate <= reportingPeriod.end_date;
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
    const initialResponses = createInitialResponses(catalog);
    return submissionLocalRepository.createCollection({
      institutionId: bootstrap.institution.id,
      unitId: unit.id,
      reportingPeriodId: reportingPeriod.id,
      reportingPeriodLabel: reportingPeriod.label,
      collectionDate: getDefaultCollectionDate(reportingPeriod),
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
      collectionDate: getDefaultCollectionDate(reportingPeriod),
    });
  },

  async updateCollectionDate(recordId: string, collectionDate: string) {
    return submissionLocalRepository.updateCollectionDate(recordId, collectionDate);
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
