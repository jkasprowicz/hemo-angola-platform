import { useSyncExternalStore } from "react";

import { getLocalDataRevision, subscribeToLocalData } from "../lib/storage/indexedDb";


export function useLocalDataRevision() {
  return useSyncExternalStore(subscribeToLocalData, getLocalDataRevision, getLocalDataRevision);
}
