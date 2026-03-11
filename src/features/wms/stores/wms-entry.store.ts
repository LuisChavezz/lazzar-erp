import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { WmsEntry } from "../interfaces/wms-entry.interface";

interface WmsEntryState {
  entries: WmsEntry[];
  hasHydrated: boolean;
  addEntry: (entry: Omit<WmsEntry, "id" | "createdAt">) => void;
  removeEntry: (entryId: string) => void;
  setHasHydrated: (value: boolean) => void;
}

const createEntryId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useWmsEntryStore = create<WmsEntryState>()(
  devtools(
    persist(
      (set) => ({
        entries: [],
        hasHydrated: false,
        addEntry: (entry) =>
          set((state) => ({
            entries: [
              {
                ...entry,
                id: createEntryId(),
                createdAt: new Date().toISOString(),
              },
              ...state.entries,
            ],
          })),
        removeEntry: (entryId) =>
          set((state) => ({
            entries: state.entries.filter((entry) => entry.id !== entryId),
          })),
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: "wms-entries-storage",
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    ),
    {
      name: "wms-entries-store",
    }
  )
);
