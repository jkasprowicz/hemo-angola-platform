import { create } from "zustand";


type SyncStoreState = {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  lastError: string | null;
  setSyncing: (value: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (value: string | null) => void;
  setLastError: (value: string | null) => void;
  resetTransientState: () => void;
  resetAll: () => void;
};


export const useSyncStore = create<SyncStoreState>((set) => ({
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  lastError: null,
  setSyncing: (value) => set({ isSyncing: value }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (value) => set({ lastSyncAt: value }),
  setLastError: (value) => set({ lastError: value }),
  resetTransientState: () =>
    set({
      isSyncing: false,
      lastError: null,
    }),
  resetAll: () =>
    set({
      isSyncing: false,
      lastSyncAt: null,
      pendingCount: 0,
      lastError: null,
    }),
}));
