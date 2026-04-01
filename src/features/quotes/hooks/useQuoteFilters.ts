import { useMemo } from "react";
import { endOfDay, isValid, parseISO } from "date-fns";
import { Quote } from "../interfaces/quote.interface";
import {
  QuoteFiltersValue,
  useQuoteFiltersStore,
} from "../stores/quote-filters.store";

const parseQuoteDate = (value: string) => {
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

export const useQuoteFilters = (quotes: Quote[]) => {
  const savedFilters = useQuoteFiltersStore((state) => state.filters);
  const saveFilters = useQuoteFiltersStore((state) => state.setFilters);
  const clearSavedFilters = useQuoteFiltersStore((state) => state.clearFilters);
  const appliedFilters = useQuoteFiltersStore((state) => state.appliedFilters);
  const setAppliedFilters = useQuoteFiltersStore((state) => state.setAppliedFilters);
  const clearAppliedFilters = useQuoteFiltersStore((state) => state.clearAppliedFilters);

  const filteredOrders = useMemo(() => {
    return quotes.filter((quote) => {
      if (appliedFilters.activo !== null && quote.estatus !== appliedFilters.activo) {
        return false;
      }

      if (
        appliedFilters.personaPagos &&
        quote.cliente_nombre !== appliedFilters.personaPagos
      ) {
        return false;
      }

      if (appliedFilters.dateFrom || appliedFilters.dateTo) {
        const createdAt = parseQuoteDate(quote.created_at ?? "");
        if (!createdAt) return false;
        if (appliedFilters.dateFrom) {
          const start = parseQuoteDate(appliedFilters.dateFrom);
          if (!start || createdAt < start) return false;
        }
        if (appliedFilters.dateTo) {
          const end = parseQuoteDate(appliedFilters.dateTo);
          if (!end) return false;
          const endDate = endOfDay(end);
          if (createdAt > endDate) return false;
        }
      }

      const amount = Number(quote.gran_total) || 0;
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
  }, [appliedFilters, quotes]);

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
          quotes
            .map((quote) => quote.cliente_nombre)
            .filter((value): value is string => Boolean(value))
        )
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [quotes]
  );

  const applyFilters = (value: QuoteFiltersValue) => {
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
