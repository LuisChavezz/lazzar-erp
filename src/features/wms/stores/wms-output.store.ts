import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { WmsOutput } from "../interfaces/wms-output.interface";

interface WmsOutputState {
  outputs: WmsOutput[];
  hasHydrated: boolean;
  addOutput: (output: Omit<WmsOutput, "id" | "createdAt">) => void;
  removeOutput: (outputId: string) => void;
  setHasHydrated: (value: boolean) => void;
}

const createOutputId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useWmsOutputStore = create<WmsOutputState>()(
  devtools(
    persist(
      (set) => ({
        outputs: [],
        hasHydrated: false,
        addOutput: (output) =>
          set((state) => ({
            outputs: [
              {
                ...output,
                id: createOutputId(),
                createdAt: new Date().toISOString(),
              },
              ...state.outputs,
            ],
          })),
        removeOutput: (outputId) =>
          set((state) => ({
            outputs: state.outputs.filter((output) => output.id !== outputId),
          })),
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: "wms-outputs-storage",
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    ),
    {
      name: "wms-outputs-store",
    }
  )
);
