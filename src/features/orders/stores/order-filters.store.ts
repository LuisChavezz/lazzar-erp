


import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Order } from "../interfaces/order.interface";

export type OrdersFiltersValue = {
  statuses: Order["estatusPedido"][];
  agente: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
};

export const orderFiltersDefault: OrdersFiltersValue = {
  statuses: [],
  agente: "",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
};

interface OrderFiltersState {
  filters: OrdersFiltersValue;
  appliedFilters: OrdersFiltersValue;
  hasHydrated: boolean;
  
  setFilters: (filters: OrdersFiltersValue) => void;
  clearFilters: () => void;
  setAppliedFilters: (filters: OrdersFiltersValue) => void;
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
