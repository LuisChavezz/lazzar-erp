import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerSearchTerm } from "@/src/hooks/useServerSearchTerm";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { searchOrders } from "../services/actions";
import { pedidoSearchQueryKey } from "../constants/ordersQueryKeys";
import { toPedidoSearchParams, type PedidoSearchFilters } from "../utils/pedidoSearchParams";

/**
 * Opciones de una búsqueda de pedidos: llave, función y política de `retry`,
 * en UN solo lugar. Las usan `usePedidoSearch` y quien prefetchee la misma
 * búsqueda (el wizard de edición de OC), así que los dos observadores de la
 * llave comparten petición Y política: un 4xx (`estatus` inválido es un 400
 * determinista) no se reintenta en ninguno.
 */
export const pedidoSearchQueryOptions = (filters: PedidoSearchFilters) => {
  const params = toPedidoSearchParams(filters);
  return {
    queryKey: pedidoSearchQueryKey(params),
    queryFn: () => searchOrders(params),
    retry: retryUnlessClientError,
  };
};

/**
 * Búsqueda de pedidos EN EL SERVIDOR para los selectores (`?q=` + `?limit=`),
 * en vez de descargar la lista completa y filtrarla en memoria. El término
 * DEBE llegar ya debounced: cada valor es una petición.
 *
 * - `keepPreviousData`: al teclear se conservan los resultados anteriores
 *   mientras llegan los nuevos (`isPlaceholderData`), sin parpadeo.
 * - `pedidos` son solo las primeras `PEDIDO_SEARCH_LIMIT` coincidencias;
 *   `total` es cuántas hay en el servidor, para avisar que hay más.
 */
export const usePedidoSearch = (filters: PedidoSearchFilters) => {
  const { data, hasLoaded, isInitialError, error, isFetching, isPlaceholderData, refetch } =
    useGuardedQuery(
      {
        ...pedidoSearchQueryOptions(filters),
        placeholderData: keepPreviousData,
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
  const { term, isDebouncing } = useServerSearchTerm(search, PEDIDO_SEARCH_DEBOUNCE_MS);
  const query = usePedidoSearch({ q: term, estatus });
  const isSearching = query.isPlaceholderData || isDebouncing;
  return { search, setSearch, isSearching, ...query };
};
