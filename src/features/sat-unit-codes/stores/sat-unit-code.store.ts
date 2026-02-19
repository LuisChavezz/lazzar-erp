import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { SatUnitCode } from "../interfaces/sat-unit-code.interface";

interface SatUnitCodeState {
  satUnitCodes: SatUnitCode[];
  selectedSatUnitCode: SatUnitCode | null;
  isLoading: boolean;

  setSatUnitCodes: (codes: SatUnitCode[]) => void;
  setSelectedSatUnitCode: (code: SatUnitCode | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addSatUnitCode: (code: SatUnitCode) => void;
  updateSatUnitCode: (code: SatUnitCode) => void;
  deleteSatUnitCode: (codeId: number) => void;
}

export const useSatUnitCodeStore = create<SatUnitCodeState>()(
  devtools(
    persist(
      (set) => ({
        satUnitCodes: [],
        selectedSatUnitCode: null,
        isLoading: false,

        setSatUnitCodes: (satUnitCodes) => set({ satUnitCodes }),
        setSelectedSatUnitCode: (selectedSatUnitCode) => set({ selectedSatUnitCode }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addSatUnitCode: (code) =>
          set((state) => ({ satUnitCodes: [...state.satUnitCodes, code] })),
        updateSatUnitCode: (code) =>
          set((state) => ({
            satUnitCodes: state.satUnitCodes.map((item) =>
              item.id_sat_unidad === code.id_sat_unidad ? { ...item, ...code } : item
            ),
          })),
        deleteSatUnitCode: (id) =>
          set((state) => ({
            satUnitCodes: state.satUnitCodes.filter((item) => item.id_sat_unidad !== id),
          })),
      }),
      {
        name: "sat-unit-code-storage",
      }
    ),
    {
      name: "sat-unit-code-store",
    }
  )
);
