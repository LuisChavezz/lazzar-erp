


import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type QuoteFiltersValue = {
  activo: number | null;
  personaPagos: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
};

export const quoteFiltersDefault: QuoteFiltersValue = {
  activo: null,
  personaPagos: "",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
};


interface QuoteFiltersState {
  filters: QuoteFiltersValue;
  appliedFilters: QuoteFiltersValue;
  hasHydrated: boolean;
  
  setFilters: (filters: QuoteFiltersValue) => void;
  clearFilters: () => void;
  setAppliedFilters: (filters: QuoteFiltersValue) => void;
  clearAppliedFilters: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useQuoteFiltersStore = create<QuoteFiltersState>()(
  devtools(
    persist(
      (set) => ({
        filters: quoteFiltersDefault,
        appliedFilters: quoteFiltersDefault,
        setFilters: (filters) => set({ filters }),
        clearFilters: () => set({ filters: quoteFiltersDefault }),
        setAppliedFilters: (filters) => set({ appliedFilters: filters }),
        clearAppliedFilters: () => set({ appliedFilters: quoteFiltersDefault }),
        hasHydrated: false,
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: "quote-filters-storage",
        partialize: (state) => ({ filters: state.filters }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
          if (state) {
            state.setAppliedFilters(state.filters);
          }
        },
      }
    ),
    {
      name: "quote-filters-store",
    }
  )
);
