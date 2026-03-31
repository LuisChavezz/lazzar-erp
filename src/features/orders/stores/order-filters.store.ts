


import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type OrderFiltersValue = {
  activo: number | null;
  personaPagos: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
};

export const orderFiltersDefault: OrderFiltersValue = {
  activo: null,
  personaPagos: "",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
};


interface OrderFiltersState {
  filters: OrderFiltersValue;
  appliedFilters: OrderFiltersValue;
  hasHydrated: boolean;
  
  setFilters: (filters: OrderFiltersValue) => void;
  clearFilters: () => void;
  setAppliedFilters: (filters: OrderFiltersValue) => void;
  clearAppliedFilters: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useOrderFiltersStore = create<OrderFiltersState>()(
  devtools(
    persist(
      (set) => ({
        filters: orderFiltersDefault,
        appliedFilters: orderFiltersDefault,
        setFilters: (filters) => set({ filters }),
        clearFilters: () => set({ filters: orderFiltersDefault }),
        setAppliedFilters: (filters) => set({ appliedFilters: filters }),
        clearAppliedFilters: () => set({ appliedFilters: orderFiltersDefault }),
        hasHydrated: false,
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: "order-filters-storage",
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
      name: "order-filters-store",
    }
  )
);
