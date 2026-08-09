import { submissionLocalRepository } from "../repositories/local/submissionLocalRepository";
import type { CollectionStatus, SyncStatus } from "../types/submission";


export const recordService = {
  async listRecords(filters?: {
    collectionStatus?: CollectionStatus;
    syncStatus?: SyncStatus;
    reportingPeriodId?: number;
  }) {
    return submissionLocalRepository.listRecords({
      collectionStatus: filters?.collectionStatus,
      syncStatus: filters?.syncStatus,
      reportingPeriodId: filters?.reportingPeriodId,
    });
  },
  async getRecord(recordId: string) {
    return submissionLocalRepository.getRecordById(recordId);
  },
};
