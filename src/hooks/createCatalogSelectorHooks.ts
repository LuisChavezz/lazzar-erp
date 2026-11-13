import { useState } from "react";
import { keepPreviousData, type QueryKey } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerSearchTerm } from "@/src/hooks/useServerSearchTerm";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import {
  CATALOG_SELECTOR_DEBOUNCE_MS,
  CATALOG_SELECTOR_PAGE_SIZE,
} from "@/src/utils/catalogSelectorQuery";

/** Parámetros mínimos de un selector de catálogo paginado (`q`, `limit`, `offset`, `ids`). */
interface CatalogSelectorBaseParams {
  q?: string;
  ids?: readonly number[];
  limit?: number;
  offset?: number;
}

/** Filtros de una búsqueda: los parámetros del selector sin paginación ni `ids`. */
export type CatalogSearchFilters<TParams extends CatalogSelectorBaseParams> = Omit<
  TParams,
  "ids" | "limit" | "offset"
>;

interface CatalogSelectorHooksConfig<TItem, TParams extends CatalogSelectorBaseParams> {
  /** Llave de la consulta para unos parámetros (con su prefijo de recurso). */
  queryKey: (params: TParams) => QueryKey;
  /** Petición al selector (siempre paginada: `{count, next, previous, results}`). */
  fetcher: (params: TParams) => Promise<PaginatedListResponse<TItem>>;
  /** `toastId` del refetch fallido de la búsqueda y del conteo (uno por hook). */
  toastIds: { search: string; total: string };
  /** Copia del toast cuando falla el refetch de una búsqueda ya cargada. */
  searchErrorMessage: string;
}

/**
 * Los tres hooks de un selector de catálogo ligero (EC-886): búsqueda en el
 * servidor, buscador con su término debounced y conteo de una fila. Los
 * comparten productos y variantes; cada catálogo pone su llave, su petición y
 * sus `toastId`.
 *
 * - `useSearch(filters, { enabled })`: una página de `CATALOG_SELECTOR_PAGE_SIZE`
 *   coincidencias (`items`) y su `total`. El término DEBE llegar debounced: cada
 *   valor es una petición. `keepPreviousData` conserva lo pintado mientras
 *   llega la siguiente búsqueda (solo con la consulta habilitada: v5 aplicaría
 *   el placeholder también a una deshabilitada).
 * - `useSearchField(filters, { enabled })`: el texto tecleado (`search`), el
 *   término que viaja (`term`), la búsqueda e `isSearching` (lo pintado es de la
 *   búsqueda anterior). Lo que esperan las props de `ServerSearchSelectList`.
 * - `useTotal(filters)`: ¿cuántas filas elegibles hay? Una página de UNA fila;
 *   lo que cuenta es `total` (`undefined` mientras carga o si falló).
 *
 * Un 4xx no se reintenta (`retryUnlessClientError`).
 */
export function createCatalogSelectorHooks<TItem, TParams extends CatalogSelectorBaseParams>({
  queryKey,
  fetcher,
  toastIds,
  searchErrorMessage,
}: CatalogSelectorHooksConfig<TItem, TParams>) {
  const useSearch = (
    filters: CatalogSearchFilters<TParams>,
    { enabled = true }: { enabled?: boolean } = {},
  ) => {
    const params = { ...filters, limit: CATALOG_SELECTOR_PAGE_SIZE } as TParams;
    const { data, hasLoaded, isInitialError, error, isFetching, isPlaceholderData, refetch } =
      useGuardedQuery(
        {
          queryKey: queryKey(params),
          queryFn: () => fetcher(params),
          retry: retryUnlessClientError,
          enabled,
          placeholderData: enabled ? keepPreviousData : undefined,
        },
        { toastId: toastIds.search, errorMessage: searchErrorMessage },
      );

    return {
      items: data?.results ?? [],
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

  const useSearchField = (
    filters: Omit<CatalogSearchFilters<TParams>, "q"> = {} as Omit<CatalogSearchFilters<TParams>, "q">,
    { enabled = true }: { enabled?: boolean } = {},
  ) => {
    const [search, setSearch] = useState("");
    const { term, isDebouncing } = useServerSearchTerm(search, CATALOG_SELECTOR_DEBOUNCE_MS);
    const query = useSearch({ ...filters, q: term } as CatalogSearchFilters<TParams>, { enabled });
    const isSearching = query.isPlaceholderData || isDebouncing;
    return { search, setSearch, term, isSearching, ...query };
  };

  const useTotal = (filters: Omit<CatalogSearchFilters<TParams>, "q"> = {} as Omit<CatalogSearchFilters<TParams>, "q">) => {
    const params = { ...filters, limit: 1 } as TParams;
    const { data, isLoading, isInitialError, error } = useGuardedQuery(
      {
        queryKey: queryKey(params),
        queryFn: () => fetcher(params),
        retry: retryUnlessClientError,
      },
      { toastId: toastIds.total },
    );
    return { total: data?.count, isLoading, isInitialError, error };
  };

  return { useSearch, useSearchField, useTotal };
}
