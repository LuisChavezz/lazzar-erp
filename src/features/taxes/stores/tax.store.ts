import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Tax } from "../interfaces/tax.interface";

interface TaxState {
  taxes: Tax[];
  selectedTax: Tax | null;
  isLoading: boolean;

  setTaxes: (taxes: Tax[]) => void;
  setSelectedTax: (tax: Tax | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addTax: (tax: Tax) => void;
  updateTax: (tax: Tax) => void;
  deleteTax: (taxId: number) => void;
}

export const useTaxStore = create<TaxState>()(
  devtools(
    persist(
      (set) => ({
        taxes: [],
        selectedTax: null,
        isLoading: false,

        setTaxes: (taxes) => set({ taxes }),
        setSelectedTax: (selectedTax) => set({ selectedTax }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addTax: (tax) => set((state) => ({ taxes: [...state.taxes, tax] })),
        updateTax: (tax) =>
          set((state) => ({
            taxes: state.taxes.map((t) => (t.id === tax.id ? { ...t, ...tax } : t)),
          })),
        deleteTax: (id) =>
          set((state) => ({
            taxes: state.taxes.filter((t) => t.id !== id),
          })),
      }),
      {
        name: "tax-storage",
      }
    ),
    {
      name: "tax-store",
    }
  )
);
