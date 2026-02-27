import { useMemo } from "react";
import { Order } from "../interfaces/order.interface";
import {
  OrderFiltersValue,
  useOrderFiltersStore,
} from "../stores/order-filters.store";

const parseOrderDate = (value: string) => {
  if (!value) return null;
  if (value.includes("/")) {
    const [day, month, year] = value.split("/").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value.includes("-")) {
    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const useOrderFilters = (orders: Order[]) => {
  const savedFilters = useOrderFiltersStore((state) => state.filters);
  const saveFilters = useOrderFiltersStore((state) => state.setFilters);
  const clearSavedFilters = useOrderFiltersStore((state) => state.clearFilters);
  const appliedFilters = useOrderFiltersStore((state) => state.appliedFilters);
  const setAppliedFilters = useOrderFiltersStore((state) => state.setAppliedFilters);
  const clearAppliedFilters = useOrderFiltersStore((state) => state.clearAppliedFilters);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (appliedFilters.statuses.length > 0 && !appliedFilters.statuses.includes(order.estatusPedido)) {
        return false;
      }

      if (appliedFilters.agente && order.agente !== appliedFilters.agente) {
        return false;
      }

      if (appliedFilters.dateFrom || appliedFilters.dateTo) {
        const createdAt = parseOrderDate(order.fecha);
        if (!createdAt) return false;
        if (appliedFilters.dateFrom) {
          const start = parseOrderDate(appliedFilters.dateFrom);
          if (!start || createdAt < start) return false;
        }
        if (appliedFilters.dateTo) {
          const end = parseOrderDate(appliedFilters.dateTo);
          if (!end) return false;
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (createdAt > endOfDay) return false;
        }
      }

      const amount = order.totals?.granTotal ?? 0;
      if (appliedFilters.minAmount) {
        const minValue = Number(appliedFilters.minAmount);
        if (!Number.isNaN(minValue) && amount <= minValue) return false;
      }
      if (appliedFilters.maxAmount) {
        const maxValue = Number(appliedFilters.maxAmount);
        if (!Number.isNaN(maxValue) && amount >= maxValue) return false;
      }

      return true;
    });
  }, [appliedFilters, orders]);

  const hasActiveFilters =
    appliedFilters.statuses.length > 0 ||
    appliedFilters.agente.length > 0 ||
    appliedFilters.dateFrom.length > 0 ||
    appliedFilters.dateTo.length > 0 ||
    appliedFilters.minAmount.length > 0 ||
    appliedFilters.maxAmount.length > 0;

  const applyFilters = (value: OrderFiltersValue) => {
    setAppliedFilters(value);
  };

  const clearFilters = () => {
    clearAppliedFilters();
  };

  return {
    filters: appliedFilters,
    filteredOrders,
    hasActiveFilters,
    applyFilters,
    clearFilters,
    savedFilters,
    saveFilters,
    clearSavedFilters,
  };
};
