import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { UnitOfMeasure } from "../interfaces/unit-of-measure.interface";

interface UnitOfMeasureState {
  units: UnitOfMeasure[];
  selectedUnit: UnitOfMeasure | null;
  isLoading: boolean;

  setUnits: (units: UnitOfMeasure[]) => void;
  setSelectedUnit: (unit: UnitOfMeasure | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addUnit: (unit: UnitOfMeasure) => void;
  updateUnit: (unit: UnitOfMeasure) => void;
  deleteUnit: (unitId: number) => void;
}

export const useUnitOfMeasureStore = create<UnitOfMeasureState>()(
  devtools(
    persist(
      (set) => ({
        units: [],
        selectedUnit: null,
        isLoading: false,

        setUnits: (units) => set({ units }),
        setSelectedUnit: (selectedUnit) => set({ selectedUnit }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),
        updateUnit: (unit) =>
          set((state) => ({
            units: state.units.map((u) => (u.id === unit.id ? { ...u, ...unit } : u)),
          })),
        deleteUnit: (id) =>
          set((state) => ({
            units: state.units.filter((u) => u.id !== id),
          })),
      }),
      {
        name: "unit-of-measure-storage",
      }
    ),
    {
      name: "unit-of-measure-store",
    }
  )
);
