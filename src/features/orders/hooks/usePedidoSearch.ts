import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { searchOrders, type PedidoSearchParams } from "../services/actions";
import { ORDERS_QUERY_KEY } from "./useOrders";

/**
 * Coincidencias que pide un selector por búsqueda. Más que las que cabe
 * revisar a ojo: si no está entre ellas, se acota tecleando.
 */
export const PEDIDO_SEARCH_LIMIT = 50;

export interface PedidoSearchFilters {
  /** Término YA debounced y recortado; vacío = sin búsqueda (los más recientes). */
  q: string;
  /** Códigos de estatus de INCLUSIÓN separados por coma (`"3,4"`), si el selector acota. */
  estatus?: string;
}

const toParams = ({ q, estatus }: PedidoSearchFilters): PedidoSearchParams => ({
  ...(q ? { q } : {}),
  ...(estatus ? { estatus } : {}),
  limit: PEDIDO_SEARCH_LIMIT,
});

/**
 * Llave y función de una búsqueda de pedidos. Bajo el prefijo `["orders"]`
 * (`ORDERS_QUERY_KEY`): las mutaciones de pedidos, que invalidan ese prefijo,
 * la refrescan; y va bajo `"search"`, aparte de la lista completa
 * (`ordersQueryKey`), porque trae solo una página.
 */
export const pedidoSearchQueryOptions = (filters: PedidoSearchFilters) => {
  const params = toParams(filters);
  return {
    queryKey: [...ORDERS_QUERY_KEY, "search", params] as const,
    queryFn: () => searchOrders(params),
  };
};

/**
 * Búsqueda de pedidos EN EL SERVIDOR para los selectores (`?q=` + `?limit=`),
 * en vez de descargar la lista completa y filtrarla en memoria. El término
 * DEBE llegar ya debounced: cada valor es una petición.
 *
 * - `keepPreviousData`: al teclear se conservan los resultados anteriores
 *   mientras llegan los nuevos (`isPlaceholderData`), sin parpadeo.
 * - Un 4xx no se reintenta (`estatus` inválido es un 400 determinista).
 * - `pedidos` son solo las primeras `PEDIDO_SEARCH_LIMIT` coincidencias;
 *   `total` es cuántas hay en el servidor, para avisar que hay más.
 */
export const usePedidoSearch = (filters: PedidoSearchFilters) => {
  const { data, hasLoaded, isInitialError, error, isFetching, isPlaceholderData, refetch } =
    useGuardedQuery(
      {
        ...pedidoSearchQueryOptions(filters),
        placeholderData: keepPreviousData,
        retry: retryUnlessClientError,
      },
      {
        toastId: "pedido-search-refetch-error",
        errorMessage:
          "No se pudo actualizar la búsqueda de pedidos. Mostrando los resultados anteriores.",
      },
    );

  return {
    pedidos: data?.results ?? [],
    total: data?.count ?? 0,
    /** Hay resultados que pintar (de esta búsqueda o, mientras llega, de la anterior). */
    hasResults: data !== undefined,
    hasLoaded,
    isInitialError,
    error,
    isFetching,
    isPlaceholderData,
    refetch,
  };
};

/** Espera tras la última tecla antes de buscar, como el selector de SKU de las OC. */
const PEDIDO_SEARCH_DEBOUNCE_MS = 350;

/**
 * Buscador de un selector de pedidos: el texto tecleado (`search`), su
 * consulta debounced (`usePedidoSearch`) y `isSearching` (hay una búsqueda en
 * camino, así que lo pintado es de la anterior). Lo que esperan las props de
 * `ServerSearchSelectList`.
 */
export const usePedidoSearchField = ({ estatus }: { estatus?: string } = {}) => {
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), PEDIDO_SEARCH_DEBOUNCE_MS);
  const query = usePedidoSearch({ q, estatus });
  const isSearching = query.isPlaceholderData || q !== search.trim();
  return { search, setSearch, isSearching, ...query };
};
