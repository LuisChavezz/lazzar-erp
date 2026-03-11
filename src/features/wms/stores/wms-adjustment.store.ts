import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { WmsAdjustment } from "../interfaces/wms-adjustment.interface";

interface WmsAdjustmentState {
  adjustments: WmsAdjustment[];
  hasHydrated: boolean;
  addAdjustment: (adjustment: Omit<WmsAdjustment, "id" | "createdAt">) => void;
  removeAdjustment: (adjustmentId: string) => void;
  setHasHydrated: (value: boolean) => void;
}

const createAdjustmentId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useWmsAdjustmentStore = create<WmsAdjustmentState>()(
  devtools(
    persist(
      (set) => ({
        adjustments: [],
        hasHydrated: false,
        addAdjustment: (adjustment) =>
          set((state) => ({
            adjustments: [
              {
                ...adjustment,
                id: createAdjustmentId(),
                createdAt: new Date().toISOString(),
              },
              ...state.adjustments,
            ],
          })),
        removeAdjustment: (adjustmentId) =>
          set((state) => ({
            adjustments: state.adjustments.filter(
              (adjustment) => adjustment.id !== adjustmentId
            ),
          })),
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: "wms-adjustments-storage",
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    ),
    {
      name: "wms-adjustments-store",
    }
  )
);
