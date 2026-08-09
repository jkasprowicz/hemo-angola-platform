import {
  deleteQueueItem,
  deleteRecord,
  getAuditEvents,
  getQueueItems,
  getRecord,
  getRecords,
  putAuditEvent,
  putQueueItem,
  putRecord,
  setMetaValue,
} from "../../lib/storage/indexedDb";
import type {
  AuditTrailEvent,
  CollectionResponseMap,
  CollectionStatus,
  LocalSubmissionRecord,
  RecordEvent,
  SyncQueueItem,
  SyncStatus,
  ValidationSummary,
} from "../../types/submission";


function isActiveCollectionStatus(status: CollectionStatus) {
  return status === "in_progress" || status === "ready_for_review";
}

function deriveCollectionStatus(validationSummary: ValidationSummary): CollectionStatus {
  void validationSummary;
  return "in_progress";
}

function createEvent(
  type: RecordEvent["type"],
  action: string,
  occurredAt: string,
  label: string,
  record: Pick<LocalSubmissionRecord, "id" | "unitId" | "reportingPeriodId" | "responsibleDisplayName" | "responsibleRole">,
  options?: {
    detail?: string | null;
    entityType?: string;
    entityId?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    source?: "local" | "client_offline" | "server";
  },
): RecordEvent {
  return {
    id: crypto.randomUUID(),
    type,
    action,
    label,
    occurredAt,
    actorName: record.responsibleDisplayName,
    actorRole: record.responsibleRole,
    entityType: options?.entityType ?? "collection",
    entityId: options?.entityId ?? record.id,
    unitId: record.unitId,
    reportingPeriodId: record.reportingPeriodId,
    correlationId: options?.correlationId ?? crypto.randomUUID(),
    source: options?.source ?? "local",
    metadata: options?.metadata ?? {},
    before: options?.before ?? {},
    after: options?.after ?? {},
    detail: options?.detail ?? null,
  };
}

async function appendEvent(record: LocalSubmissionRecord, event: RecordEvent) {
  const updatedRecord = {
    ...record,
    eventHistory: [...record.eventHistory, event].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    ),
  };
  await putAuditEvent({ ...event, recordId: record.id } satisfies AuditTrailEvent);
  return updatedRecord;
}

async function deleteQueueItemsForRecord(recordId: string) {
  const queueItems = await getQueueItems();
  const relatedItems = queueItems.filter((item) => item.localRecordId === recordId);
  await Promise.all(relatedItems.map((item) => deleteQueueItem(item.id)));
}

export const submissionLocalRepository = {
  async findActiveByContext(unitId: number, reportingPeriodId: number) {
    const records = await getRecords();
    return (
      records.find(
        (record) =>
          record.unitId === unitId &&
          record.reportingPeriodId === reportingPeriodId &&
          isActiveCollectionStatus(record.collectionStatus),
      ) ?? null
    );
  },

  async createCollection(input: {
    institutionId: number;
    unitId: number;
    reportingPeriodId: number;
    reportingPeriodLabel: string;
    cycleUuid: string;
    responsibleUsername: string;
    responsibleDisplayName: string;
    responsibleRole: LocalSubmissionRecord["responsibleRole"];
    responses: CollectionResponseMap;
    validationSummary: ValidationSummary;
    catalogVersionSummary: string;
  }) {
    const existing = await this.findActiveByContext(input.unitId, input.reportingPeriodId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const record: LocalSubmissionRecord = {
      id: crypto.randomUUID(),
      institutionId: input.institutionId,
      unitId: input.unitId,
      reportingPeriodId: input.reportingPeriodId,
      reportingPeriodLabel: input.reportingPeriodLabel,
      cycleUuid: input.cycleUuid,
      responsibleUsername: input.responsibleUsername,
      responsibleDisplayName: input.responsibleDisplayName,
      responsibleRole: input.responsibleRole,
      collectionStatus: "in_progress",
      syncStatus: "local_only",
      generalObservation: "",
      responses: input.responses,
      validationSummary: input.validationSummary,
      submissionUuid: null,
      versionUuid: null,
      versionNumber: 0,
      basedOnRecordId: null,
      createdAt: now,
      lastSavedAt: now,
      closedAt: null,
      syncedAt: null,
      acceptedAt: null,
      lastSyncAttemptAt: null,
      lastError: null,
      catalogVersionSummary: input.catalogVersionSummary,
      eventHistory: [],
    };
    const initialEvent = createEvent("collection_created", "COLLECTION_CREATED", now, "Coleta iniciada", record, {
      after: { reportingPeriodId: record.reportingPeriodId, reportingPeriodLabel: record.reportingPeriodLabel },
      correlationId: record.cycleUuid,
    });
    record.eventHistory = [initialEvent];
    await putAuditEvent({ ...initialEvent, recordId: record.id });

    await putRecord(record);
    return record;
  },

  async saveCollection(input: {
    recordId: string;
    responses: CollectionResponseMap;
    generalObservation: string;
    validationSummary: ValidationSummary;
  }) {
    const existing = await getRecord(input.recordId);
    if (!existing) {
      throw new Error("Coleta local não encontrada.");
    }

    if (!isActiveCollectionStatus(existing.collectionStatus)) {
      throw new Error("A coleta não pode mais ser editada.");
    }

    const now = new Date().toISOString();
    const nextRecord: LocalSubmissionRecord = {
      ...existing,
      collectionStatus: deriveCollectionStatus(input.validationSummary),
      syncStatus: "local_only",
      generalObservation: input.generalObservation,
      responses: input.responses,
      validationSummary: input.validationSummary,
      lastSavedAt: now,
      lastError: null,
    };
    let updatedRecord = await appendEvent(
      nextRecord,
      createEvent("collection_saved", "COLLECTION_UPDATED", now, "Coleta salva neste dispositivo", nextRecord, {
        after: { overallCompletionPercentage: input.validationSummary.overallCompletionPercentage },
        correlationId: existing.submissionUuid ?? existing.cycleUuid,
      }),
    );

    for (const [fieldCode, nextValue] of Object.entries(input.responses)) {
      const previousValue = existing.responses[fieldCode];
      if (previousValue !== nextValue) {
        updatedRecord = await appendEvent(
          updatedRecord,
          createEvent("field_updated", "FIELD_UPDATED", now, `Campo ${fieldCode} atualizado`, nextRecord, {
            entityType: "collection_field",
            entityId: fieldCode,
            metadata: { fieldCode },
            before: { value: previousValue },
            after: { value: nextValue },
            correlationId: existing.submissionUuid ?? existing.cycleUuid,
          }),
        );
      }
    }

    if (existing.generalObservation !== input.generalObservation) {
      updatedRecord = await appendEvent(
        updatedRecord,
        createEvent("field_updated", "FIELD_UPDATED", now, "Observação geral atualizada", nextRecord, {
          entityType: "collection_field",
          entityId: "generalObservation",
          metadata: { fieldCode: "generalObservation" },
          before: { value: existing.generalObservation },
          after: { value: input.generalObservation },
          correlationId: existing.submissionUuid ?? existing.cycleUuid,
        }),
      );
    }

    await putRecord(updatedRecord);
    return updatedRecord;
  },

  async listRecords(filters?: {
    collectionStatus?: CollectionStatus;
    syncStatus?: SyncStatus;
    reportingPeriodId?: number;
  }) {
    let records = await getRecords();
    records = records.sort((left, right) => right.lastSavedAt.localeCompare(left.lastSavedAt));
    if (filters?.collectionStatus) {
      records = records.filter((record) => record.collectionStatus === filters.collectionStatus);
    }
    if (filters?.syncStatus) {
      records = records.filter((record) => record.syncStatus === filters.syncStatus);
    }
    if (filters?.reportingPeriodId) {
      records = records.filter((record) => record.reportingPeriodId === filters.reportingPeriodId);
    }
    return records;
  },

  async getRecordById(recordId: string) {
    return getRecord(recordId);
  },

  async updateReportingPeriod(recordId: string, input: { reportingPeriodId: number; reportingPeriodLabel: string }) {
    const record = await getRecord(recordId);
    if (!record) {
      throw new Error("Coleta local não encontrada.");
    }
    if (!isActiveCollectionStatus(record.collectionStatus)) {
      throw new Error("O período só pode ser alterado enquanto a coleta estiver em preenchimento.");
    }

    const existing = await this.findActiveByContext(record.unitId, input.reportingPeriodId);
    if (existing && existing.id !== record.id) {
      throw new Error(`Já existe uma coleta em andamento para ${input.reportingPeriodLabel}.`);
    }

    const now = new Date().toISOString();
    const updatedRecord = await appendEvent(
      {
        ...record,
        reportingPeriodId: input.reportingPeriodId,
        reportingPeriodLabel: input.reportingPeriodLabel,
        lastSavedAt: now,
      },
      createEvent("collection_period_changed", "COLLECTION_PERIOD_CHANGED", now, "Período de referência atualizado", record, {
        before: { reportingPeriodId: record.reportingPeriodId, reportingPeriodLabel: record.reportingPeriodLabel },
        after: { reportingPeriodId: input.reportingPeriodId, reportingPeriodLabel: input.reportingPeriodLabel },
        correlationId: record.submissionUuid ?? record.cycleUuid,
      }),
    );

    await putRecord(updatedRecord);
    return updatedRecord;
  },

  async closeCollection(recordId: string, validationSummary: ValidationSummary) {
    const record = await getRecord(recordId);
    if (!record) {
      throw new Error("Coleta local não encontrada.");
    }
    if (!validationSummary.valid) {
      throw new Error("Existem inconsistências que impedem o fechamento.");
    }
    if (!isActiveCollectionStatus(record.collectionStatus)) {
      throw new Error("A coleta já foi fechada ou recebida.");
    }

    const closedAt = new Date().toISOString();
    const submissionUuid = record.submissionUuid ?? crypto.randomUUID();
    const versionUuid = crypto.randomUUID();

    const updatedRecord = await appendEvent(
      {
        ...record,
        submissionUuid,
        versionUuid,
        versionNumber: 1,
        collectionStatus: "closed",
        syncStatus: "pending",
        validationSummary,
        closedAt,
        lastSavedAt: closedAt,
        lastError: null,
      },
      createEvent("collection_closed", "COLLECTION_CLOSED", closedAt, "Coleta fechada e pronta para envio", record, {
        correlationId: submissionUuid,
        after: { submissionUuid, versionUuid, versionNumber: 1 },
      }),
    );

    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      localRecordId: record.id,
      submissionUuid,
      versionUuid,
      versionNumber: 1,
      status: "queued",
      attemptCount: 0,
      lastAttemptAt: null,
      nextAttemptAt: null,
    };

    await putRecord(updatedRecord);
    await putQueueItem(queueItem);
    return updatedRecord;
  },

  async reopenCollection(recordId: string) {
    const record = await getRecord(recordId);
    if (!record) {
      throw new Error("Coleta local não encontrada.");
    }
    if (record.collectionStatus !== "closed" || record.syncStatus !== "pending") {
      throw new Error("A coleta não pode ser reaberta.");
    }
    if (record.syncedAt) {
      throw new Error("Coletas já sincronizadas não podem ser reabertas.");
    }

    const now = new Date().toISOString();
    const updatedRecord = await appendEvent(
      {
        ...record,
        collectionStatus: deriveCollectionStatus(record.validationSummary),
        syncStatus: "local_only",
        submissionUuid: null,
        versionUuid: null,
        versionNumber: 0,
        closedAt: null,
        lastSavedAt: now,
        lastError: null,
      },
      createEvent("collection_reopened", "COLLECTION_REOPENED", now, "Coleta reaberta para correção", record, {
        correlationId: record.submissionUuid ?? record.cycleUuid,
      }),
    );

    await putRecord(updatedRecord);
    await putAuditEvent({
      ...createEvent("collection_deleted", "COLLECTION_DELETED", new Date().toISOString(), "Coleta excluída deste dispositivo", record, {
        correlationId: record.submissionUuid ?? record.cycleUuid,
      }),
      recordId: record.id,
    });
    await deleteQueueItemsForRecord(recordId);
    return updatedRecord;
  },

  async deleteLocalCollection(recordId: string) {
    const record = await getRecord(recordId);
    if (!record) {
      return;
    }
    if (record.syncedAt || record.collectionStatus === "received" || record.syncStatus === "synced") {
      throw new Error("Apenas coletas locais ainda não enviadas podem ser excluídas.");
    }

    await deleteQueueItemsForRecord(recordId);
    await deleteRecord(recordId);
  },

  async markSyncing(recordId: string, queueItemId: string) {
    const [record, queueItems] = await Promise.all([getRecord(recordId), getQueueItems()]);
    if (!record) {
      return;
    }
    const queueItem = queueItems.find((item) => item.id === queueItemId);
    if (!queueItem) {
      return;
    }

    const now = new Date().toISOString();
    await putRecord(
      await appendEvent(
        {
          ...record,
          syncStatus: "syncing",
          lastError: null,
          lastSyncAttemptAt: now,
        },
        createEvent("sync_started", "SUBMISSION_SYNC_STARTED", now, "Envio iniciado", record, {
          correlationId: record.submissionUuid ?? record.cycleUuid,
        }),
      ),
    );
    await putQueueItem({
      ...queueItem,
      status: "syncing",
      attemptCount: queueItem.attemptCount + 1,
      lastAttemptAt: now,
    });
  },

  async markSynced(recordId: string, queueItemId: string, syncedAt: string) {
    const record = await getRecord(recordId);
    if (!record) {
      return;
    }
    await putRecord(
      await appendEvent(
        {
          ...record,
          collectionStatus: "received",
          syncStatus: "synced",
          syncedAt,
          acceptedAt: null,
          lastSavedAt: syncedAt,
          lastSyncAttemptAt: syncedAt,
          lastError: null,
        },
        createEvent("sync_succeeded", "SUBMISSION_RECEIVED", syncedAt, "Coleta recebida pelo servidor", record, {
          correlationId: record.submissionUuid ?? record.cycleUuid,
        }),
      ),
    );
    await deleteQueueItem(queueItemId);
    await setMetaValue("lastSyncAt", syncedAt);
  },

  async markSyncError(recordId: string, queueItemId: string, errorMessage: string) {
    const [record, queueItems] = await Promise.all([getRecord(recordId), getQueueItems()]);
    const queueItem = queueItems.find((item) => item.id === queueItemId);
    if (!record || !queueItem) {
      return;
    }
    const attemptedAt = new Date().toISOString();
    const nextAttemptAt = new Date(
      Date.now() + Math.min(60_000, 2 ** queueItem.attemptCount * 5_000),
    ).toISOString();
    await putRecord(
      await appendEvent(
        {
          ...record,
          collectionStatus: "closed",
          syncStatus: "error",
          lastError: errorMessage,
          lastSavedAt: attemptedAt,
          lastSyncAttemptAt: attemptedAt,
        },
        createEvent("sync_failed", "SUBMISSION_SYNC_FAILED", attemptedAt, "Erro no envio", record, {
          detail: errorMessage,
          correlationId: record.submissionUuid ?? record.cycleUuid,
        }),
      ),
    );
    await putQueueItem({
      ...queueItem,
      status: "failed",
      nextAttemptAt,
      lastAttemptAt: attemptedAt,
    });
  },

  async recoverInterruptedSyncs(errorMessage = "Envio interrompido.") {
    const [records, queueItems] = await Promise.all([getRecords(), getQueueItems()]);
    const orphanedRecords = records.filter((record) => record.syncStatus === "syncing");

    if (orphanedRecords.length === 0) {
      return 0;
    }

    const recoveredAt = new Date().toISOString();
    for (const record of orphanedRecords) {
      const relatedQueueItem = queueItems.find((item) => item.localRecordId === record.id);
      await putRecord(
        await appendEvent(
          {
            ...record,
            collectionStatus: "closed",
            syncStatus: "error",
            lastError: errorMessage,
            lastSavedAt: recoveredAt,
            lastSyncAttemptAt: recoveredAt,
          },
          createEvent("sync_failed", "SUBMISSION_SYNC_FAILED", recoveredAt, "Envio interrompido", record, {
            detail: errorMessage,
            correlationId: record.submissionUuid ?? record.cycleUuid,
          }),
        ),
      );

      if (relatedQueueItem) {
        await putQueueItem({
          ...relatedQueueItem,
          status: "failed",
          lastAttemptAt: recoveredAt,
          nextAttemptAt: recoveredAt,
        });
      }
    }

    return orphanedRecords.length;
  },

  async getEligibleQueueItems(nowIso: string, recordIds?: string[]) {
    const queueItems = await getQueueItems();
    return queueItems.filter((item) => {
      if (recordIds && !recordIds.includes(item.localRecordId)) {
        return false;
      }
      if (item.status === "queued") {
        return true;
      }
      if (item.status === "failed" && item.nextAttemptAt) {
        return item.nextAttemptAt <= nowIso;
      }
      return false;
    });
  },

  async getAuditEvents(recordId?: string) {
    const events = await getAuditEvents();
    return events
      .filter((event) => (recordId ? event.recordId === recordId : true))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  },
};
