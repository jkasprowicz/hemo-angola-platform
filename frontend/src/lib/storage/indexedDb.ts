import { openDB } from "idb";

import type { AuditTrailEvent, LocalSubmissionRecord, SyncQueueItem } from "../../types/submission";


const DB_NAME = "hemo-angola-prototype";
const DB_VERSION = 6;

const RECORD_STORE = "submission_records";
const QUEUE_STORE = "sync_queue";
const META_STORE = "meta";
const AUDIT_STORE = "audit_events";

let databasePromise: ReturnType<typeof openDB> | null = null;
let localDataRevision = 0;
const localDataListeners = new Set<() => void>();

function normalizeLegacyRecord(record: LocalSubmissionRecord): LocalSubmissionRecord {
  const legacyRecord = record as LocalSubmissionRecord & {
    lastSavedAt?: string;
    collectionDate?: string | null;
    submittedAt?: string | null;
    receivedAt?: string | null;
  };

  return {
    ...record,
    collectionDate: legacyRecord.collectionDate ?? null,
    updatedAt: record.updatedAt ?? legacyRecord.lastSavedAt ?? record.createdAt,
    submittedAt: record.submittedAt ?? legacyRecord.submittedAt ?? null,
    receivedAt: record.receivedAt ?? legacyRecord.receivedAt ?? null,
    eventHistory: record.eventHistory.map((event) => ({
      ...event,
      collectionDate: event.collectionDate ?? legacyRecord.collectionDate ?? null,
    })),
  };
}

function notifyLocalDataChanged() {
  localDataRevision += 1;
  for (const listener of localDataListeners) {
    listener();
  }
}


export function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 4) {
          if (db.objectStoreNames.contains(RECORD_STORE)) {
            db.deleteObjectStore(RECORD_STORE);
          }
          if (db.objectStoreNames.contains(QUEUE_STORE)) {
            db.deleteObjectStore(QUEUE_STORE);
          }
          if (db.objectStoreNames.contains(META_STORE)) {
            db.deleteObjectStore(META_STORE);
          }
        }
        if (!db.objectStoreNames.contains(RECORD_STORE)) {
          const store = db.createObjectStore(RECORD_STORE, { keyPath: "id" });
          store.createIndex("status", "status");
          store.createIndex("reportingPeriodId", "reportingPeriodId");
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
          queueStore.createIndex("status", "status");
          queueStore.createIndex("nextAttemptAt", "nextAttemptAt");
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
        if (!db.objectStoreNames.contains(AUDIT_STORE)) {
          const auditStore = db.createObjectStore(AUDIT_STORE, { keyPath: "id" });
          auditStore.createIndex("recordId", "recordId");
          auditStore.createIndex("occurredAt", "occurredAt");
          auditStore.createIndex("reportingPeriodId", "reportingPeriodId");
        }
      },
    });
  }

  return databasePromise;
}

export async function initializeIndexedDb() {
  await getDatabase();
}

export async function putRecord(record: LocalSubmissionRecord) {
  const db = await getDatabase();
  await db.put(RECORD_STORE, record);
  notifyLocalDataChanged();
}

export async function getRecord(recordId: string) {
  const db = await getDatabase();
  const record = (await db.get(RECORD_STORE, recordId)) as LocalSubmissionRecord | undefined;
  return record ? normalizeLegacyRecord(record) : undefined;
}

export async function getRecords() {
  const db = await getDatabase();
  return ((await db.getAll(RECORD_STORE)) as LocalSubmissionRecord[]).map(normalizeLegacyRecord);
}

export async function deleteRecord(recordId: string) {
  const db = await getDatabase();
  await db.delete(RECORD_STORE, recordId);
  notifyLocalDataChanged();
}

export async function putQueueItem(item: SyncQueueItem) {
  const db = await getDatabase();
  await db.put(QUEUE_STORE, item);
  notifyLocalDataChanged();
}

export async function getQueueItems() {
  const db = await getDatabase();
  return (await db.getAll(QUEUE_STORE)) as SyncQueueItem[];
}

export async function deleteQueueItem(queueItemId: string) {
  const db = await getDatabase();
  await db.delete(QUEUE_STORE, queueItemId);
  notifyLocalDataChanged();
}

export async function setMetaValue<T>(key: string, value: T) {
  const db = await getDatabase();
  await db.put(META_STORE, value, key);
  notifyLocalDataChanged();
}

export async function putAuditEvent(event: AuditTrailEvent) {
  const db = await getDatabase();
  await db.put(AUDIT_STORE, event);
  notifyLocalDataChanged();
}

export async function getAuditEvents() {
  const db = await getDatabase();
  return (await db.getAll(AUDIT_STORE)) as AuditTrailEvent[];
}

export async function getAuditEventsByRecordId(recordId: string) {
  const db = await getDatabase();
  return (await db.getAllFromIndex(AUDIT_STORE, "recordId", recordId)) as AuditTrailEvent[];
}

export async function getMetaValue<T>(key: string) {
  const db = await getDatabase();
  return (await db.get(META_STORE, key)) as T | undefined;
}

export async function deleteMetaValue(key: string) {
  const db = await getDatabase();
  await db.delete(META_STORE, key);
  notifyLocalDataChanged();
}

export async function resetIndexedDbForTests() {
  const db = await getDatabase();
  db.close();
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB deletion blocked"));
  });
  notifyLocalDataChanged();
}

export function subscribeToLocalData(listener: () => void) {
  localDataListeners.add(listener);
  return () => {
    localDataListeners.delete(listener);
  };
}

export function getLocalDataRevision() {
  return localDataRevision;
}
