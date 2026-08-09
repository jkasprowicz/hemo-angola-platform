import { getMetaValue } from "../storage/indexedDb";
import { submissionLocalRepository } from "../../repositories/local/submissionLocalRepository";
import { syncRemoteRepository } from "../../repositories/remote/syncRemoteRepository";
import { useSyncStore } from "./syncStore";


function getFriendlySyncErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Não foi possível sincronizar os dados. Tente novamente.";
  }

  if (
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError") ||
    error.message.includes("fetch")
  ) {
    return "Não foi possível sincronizar os dados. Verifique a conexão e tente novamente.";
  }

  return error.message || "Não foi possível sincronizar os dados. Tente novamente.";
}


export async function hydrateSyncMeta() {
  await submissionLocalRepository.recoverInterruptedSyncs();
  const lastSyncAt = await getMetaValue<string>("lastSyncAt");
  useSyncStore.getState().setLastSyncAt(lastSyncAt ?? null);
  const pending = await submissionLocalRepository.getEligibleQueueItems(new Date().toISOString());
  useSyncStore.getState().setPendingCount(pending.length);
}


export async function runSync(recordIds?: string[]) {
  const state = useSyncStore.getState();
  if (state.isSyncing) {
    return;
  }

  state.setSyncing(true);
  state.setLastError(null);

  const syncingEntries: Array<{ recordId: string; queueItemId: string }> = [];

  try {
    const queueItems = await submissionLocalRepository.getEligibleQueueItems(new Date().toISOString(), recordIds);
    state.setPendingCount(queueItems.length);
    if (queueItems.length === 0) {
      state.setSyncing(false);
      return;
    }

    const payload = [];
    for (const queueItem of queueItems) {
      const record = await submissionLocalRepository.getRecordById(queueItem.localRecordId);
      if (record) {
        payload.push({ record, queueItem });
        await submissionLocalRepository.markSyncing(record.id, queueItem.id);
        syncingEntries.push({ recordId: record.id, queueItemId: queueItem.id });
      }
    }

    const response = await syncRemoteRepository.syncItems(payload);

    for (const result of response.results) {
      const queueItem = payload.find((entry) => entry.record.id === result.localId)?.queueItem;
      if (queueItem) {
        await submissionLocalRepository.markSynced(result.localId, queueItem.id, result.syncedAt ?? new Date().toISOString());
      }
      state.setLastSyncAt(result.syncedAt ?? new Date().toISOString());
    }
  } catch (error) {
    console.error(error);
    const message = getFriendlySyncErrorMessage(error);
    for (const entry of syncingEntries) {
      await submissionLocalRepository.markSyncError(entry.recordId, entry.queueItemId, message);
    }
    state.setLastError(message);
  } finally {
    const pending = await submissionLocalRepository.getEligibleQueueItems(new Date().toISOString());
    state.setPendingCount(pending.length);
    state.setSyncing(false);
  }
}
