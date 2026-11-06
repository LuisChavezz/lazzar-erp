"use client";

import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerSearchTerm } from "@/src/hooks/useServerSearchTerm";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPurchaseOrdersPage } from "../services/actions";
import { PURCHASE_ORDERS_KEY } from "./usePurchaseOrdersTable";
import {
  toPurchaseOrderSearchParams,
  type PurchaseOrderSearchFilters,
} from "../utils/purchaseOrderSearchParams";

/** Espera tras la última tecla antes de buscar, como el selector de pedidos. */
const PURCHASE_ORDER_SEARCH_DEBOUNCE_MS = 350;

/**
 * Buscador de un selector de órdenes de compra EN EL SERVIDOR
 * (`GET /compras/ordenes/?search=&limit=`), en vez de descargar la lista
 * completa y filtrarla en memoria. Lo que esperan las props de
 * `ServerSearchSelectList`: el texto tecleado (`search`), las primeras
 * coincidencias y su total, e `isSearching` (lo pintado es de la búsqueda
 * anterior mientras llega la nueva, `keepPreviousData`).
 *
 * La llave cuelga de `["purchase-orders"]`, así que las mutaciones de OC la
 * refrescan.
 */
export const usePurchaseOrderSearchField = (filters: Omit<PurchaseOrderSearchFilters, "search">) => {
  const [search, setSearch] = useState("");
  const { term, isDebouncing } = useServerSearchTerm(search, PURCHASE_ORDER_SEARCH_DEBOUNCE_MS);
  const params = toPurchaseOrderSearchParams({ ...filters, search: term });
  const { data, isInitialError, isPlaceholderData, refetch } = useGuardedQuery(
    {
      queryKey: [...PURCHASE_ORDERS_KEY, "search", params],
      queryFn: () => getPurchaseOrdersPage(params),
      // Un 4xx (un estatus que el backend no reconoce) es determinista.
      retry: retryUnlessClientError,
      placeholderData: keepPreviousData,
    },
    {
      toastId: "purchase-order-search-refetch-error",
      errorMessage:
        "No se pudo actualizar la búsqueda de órdenes de compra. Mostrando los resultados anteriores.",
    },
  );

  return {
    search,
    setSearch,
    isSearching: isPlaceholderData || isDebouncing,
    purchaseOrders: data?.results ?? [],
    total: data?.count ?? 0,
    hasResults: data !== undefined,
    isInitialError,
    refetch,
  };
};
