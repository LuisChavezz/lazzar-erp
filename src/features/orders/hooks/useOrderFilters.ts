import { useMemo } from "react";
import { endOfDay, isValid, parseISO } from "date-fns";
import { Order } from "../interfaces/order.interface";
import {
  OrderFiltersValue,
  useOrderFiltersStore,
} from "../stores/order-filters.store";

const parseOrderDate = (value: string) => {
  if (!value) return null;
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  const normalizedIsoValue = normalizedValue.includes(" ")
    ? normalizedValue.replace(" ", "T")
    : normalizedValue;
  const normalizedMillisecondsValue = normalizedIsoValue.replace(
    /\.(\d{3})\d+(?=(Z|[+-]\d{2}:\d{2}|[+-]\d{2})?$)/,
    ".$1"
  );
  let normalizedTimezoneValue = normalizedMillisecondsValue;
  if (
    normalizedMillisecondsValue.includes("T") &&
    /[+-]\d{2}$/.test(normalizedMillisecondsValue)
  ) {
    normalizedTimezoneValue = `${normalizedMillisecondsValue}:00`;
  }
  const parsedDate = parseISO(normalizedTimezoneValue);
  if (isValid(parsedDate)) return parsedDate;
  const fallbackDate = new Date(normalizedTimezoneValue);
  if (isValid(fallbackDate)) return fallbackDate;
  const normalizedOffsetValue = normalizedTimezoneValue.replace(
    /([+-]\d{2})(\d{2})$/,
    "$1:$2"
  );
  const fallbackOffsetDate = new Date(normalizedOffsetValue);
  if (isValid(fallbackOffsetDate)) return fallbackOffsetDate;
  return null;
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
      const isAuthorized = Boolean(order.autorizada_at);
      if (appliedFilters.activo !== null && isAuthorized !== appliedFilters.activo) {
        return false;
      }

      if (
        appliedFilters.personaPagos &&
        order.cliente_nombre !== appliedFilters.personaPagos
      ) {
        return false;
      }

      if (appliedFilters.dateFrom || appliedFilters.dateTo) {
        const createdAt = parseOrderDate(order.created_at ?? "");
        if (!createdAt) return false;
        if (appliedFilters.dateFrom) {
          const start = parseOrderDate(appliedFilters.dateFrom);
          if (!start || createdAt < start) return false;
        }
        if (appliedFilters.dateTo) {
          const end = parseOrderDate(appliedFilters.dateTo);
          if (!end) return false;
          const endDate = endOfDay(end);
          if (createdAt > endDate) return false;
        }
      }

      const amount = Number(order.gran_total) || 0;
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
    appliedFilters.activo !== null ||
    appliedFilters.personaPagos.length > 0 ||
    appliedFilters.dateFrom.length > 0 ||
    appliedFilters.dateTo.length > 0 ||
    appliedFilters.minAmount.length > 0 ||
    appliedFilters.maxAmount.length > 0;

  const personaPagosOptions = useMemo(
    () => [
      { value: "", label: "Todos" },
      ...Array.from(
        new Set(
          orders
            .map((order) => order.cliente_nombre)
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [orders]
  );

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
    personaPagosOptions,
  };
};
