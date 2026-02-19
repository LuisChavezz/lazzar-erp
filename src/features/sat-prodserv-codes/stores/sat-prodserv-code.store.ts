import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { SatProdservCode } from "../interfaces/sat-prodserv-code.interface";

interface SatProdservCodeState {
  satProdservCodes: SatProdservCode[];
  selectedSatProdservCode: SatProdservCode | null;
  isLoading: boolean;

  setSatProdservCodes: (codes: SatProdservCode[]) => void;
  setSelectedSatProdservCode: (code: SatProdservCode | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addSatProdservCode: (code: SatProdservCode) => void;
  updateSatProdservCode: (code: SatProdservCode) => void;
  deleteSatProdservCode: (codeId: number) => void;
}

export const useSatProdservCodeStore = create<SatProdservCodeState>()(
  devtools(
    persist(
      (set) => ({
        satProdservCodes: [],
        selectedSatProdservCode: null,
        isLoading: false,

        setSatProdservCodes: (satProdservCodes) => set({ satProdservCodes }),
        setSelectedSatProdservCode: (selectedSatProdservCode) => set({ selectedSatProdservCode }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addSatProdservCode: (code) =>
          set((state) => ({ satProdservCodes: [...state.satProdservCodes, code] })),
        updateSatProdservCode: (code) =>
          set((state) => ({
            satProdservCodes: state.satProdservCodes.map((item) =>
              item.id_sat_prodserv === code.id_sat_prodserv ? { ...item, ...code } : item
            ),
          })),
        deleteSatProdservCode: (id) =>
          set((state) => ({
            satProdservCodes: state.satProdservCodes.filter((item) => item.id_sat_prodserv !== id),
          })),
      }),
      {
        name: "sat-prodserv-code-storage",
      }
    ),
    {
      name: "sat-prodserv-code-store",
    }
  )
);
