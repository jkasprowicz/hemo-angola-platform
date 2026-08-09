import { httpClient } from "../../lib/api/httpClient";
import type { SyncResult } from "../../types/api";
import type { LocalSubmissionRecord, SyncQueueItem } from "../../types/submission";


export const syncRemoteRepository = {
  async syncItems(records: Array<{ record: LocalSubmissionRecord; queueItem: SyncQueueItem }>) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      return await httpClient.post<{ results: SyncResult[] }>("/api/sync/", {
      items: records.map(({ record, queueItem }) => ({
        local_id: record.id,
        submission_uuid: queueItem.submissionUuid,
        version_uuid: queueItem.versionUuid,
        version_number: queueItem.versionNumber,
        institution_id: record.institutionId,
        unit_id: record.unitId,
        reporting_period_id: record.reportingPeriodId,
        payload: {
          cycle: {
            cycleUuid: record.cycleUuid,
            responsibleUsername: record.responsibleUsername,
            generalObservation: record.generalObservation,
            versionNumber: record.versionNumber,
            catalogVersionSummary: record.catalogVersionSummary,
            basedOnRecordId: record.basedOnRecordId,
            collectionStatus: record.collectionStatus,
            syncStatus: record.syncStatus,
            closedAt: record.closedAt,
          },
          responses: record.responses,
        },
        validation_summary: record.validationSummary,
        audit_events: record.eventHistory.map((event) => ({
          id: event.id,
          action: event.action,
          entity_type: event.entityType,
          entity_id: event.entityId,
          correlation_id: event.correlationId,
          source: event.source,
          metadata: event.metadata,
          before: event.before,
          after: event.after,
          occurred_at: event.occurredAt,
        })),
        closed_at: record.closedAt,
      })),
      }, { signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  },

  async getServerRecords(reportingPeriodId?: number) {
    const suffix = reportingPeriodId ? `?period=${reportingPeriodId}` : "";
    return httpClient.get<{ records: Array<Record<string, unknown>> }>(`/api/records/server/${suffix}`);
  },
};
