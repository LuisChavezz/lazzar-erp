"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hashKey, partialMatchKey, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { DataTableServerMode } from "@/src/components/DataTable";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { ServerListAdapter } from "@/src/utils/serverListAdapters";
import {
  effectiveServerTableOrdering,
  hasServerTableCriteria,
  nextServerTableOrdering,
  normalizeServerTableSearch,
  readServerTableState,
  serializeServerTableFilters,
  serverTablePageSizes,
  toServerTableCriteria,
  writeServerTableQuery,
  type ServerTableDefinition,
  type ServerTableFilterParams,
  type ServerTableFilterValues,
  type ServerTableState,
} from "@/src/utils/serverTableParams";

/** Parámetros de la petición: criterios (texto) + paginación (números). */
export type ServerTableRequest = Record<string, string | number>;

interface UseServerTableOptions<P extends ServerTableFilterParams, TResponse, TRow> {
  /** Contrato de la lista con su endpoint (`defineServerTable`). */
  definition: ServerTableDefinition<P>;
  /**
   * PREFIJO de la llave (p. ej. `["opportunities"]`). La consulta vive en
   * `[...queryKey, "list", params]`, así que las mutaciones invalidan todas
   * las páginas y filtros con `invalidateQueries({ queryKey })`.
   */
  queryKey: QueryKey;
  /** La acción de `services/actions.ts`: recibe los parámetros ya validados. */
  queryFn: (params: ServerTableRequest) => Promise<TResponse>;
  /** Convención de paginación del endpoint (`serverListAdapters.ts`). */
  adapter: ServerListAdapter<TResponse, TRow>;
  /** Único por lista — ver `useHasLoadedQuery`. */
  toastId: string;
  /** Texto del toast cuando falla un refetch con datos en pantalla. */
  refetchErrorMessage?: string;
  /** Mensaje del error de cuerpo cuando el backend no manda el suyo. */
  loadErrorMessage?: string;
  enabled?: boolean;
  /**
   * Texto del cuerpo de la tabla mientras la consulta está deshabilitada
   * (`enabled: false`) y no hay nada que mostrar, p. ej. "Elige un almacén
   * para consultar".
   */
  disabledMessage?: string;
  /** Pausa de escritura antes de consultar la búsqueda. Por defecto 300 ms. */
  searchDebounceMs?: number;
  /**
   * `"always"` relee la lista cada vez que se monta, aunque esté en caché y
   * dentro del `staleTime`: para una lista que convive con otra consulta que
   * también se relee al montar (un resumen del mismo conjunto) y debe reflejar
   * el mismo momento. Por defecto, el comportamiento del `QueryClient`.
   */
  refetchOnMount?: "always";
}

// Referencia estable para "sin filas": un `[]` nuevo por render haría creer a
// la tabla que sus datos cambiaron.
const NO_ROWS: never[] = [];

/**
 * Resultado de un REFETCH al que el backend respondió "esa página ya no
 * existe" (el 404 de `?page=` tras borrar la última fila de la última página).
 * Se guarda como dato, no como error, para que no caiga en el toast de "se
 * muestran los datos anteriores": esos datos son justo los que ya no existen.
 */
const PAGE_GONE = { serverTablePageGone: true } as const;
type PageGone = typeof PAGE_GONE;
// Por propiedad y no por identidad: el structural sharing de TanStack Query
// puede guardar una copia del objeto.
const isPageGoneData = (data: unknown): data is PageGone =>
  typeof data === "object" && data !== null && "serverTablePageGone" in data;

/**
 * Estado de una lista en MODO SERVIDOR: lo lee de la URL, lo consulta y
 * devuelve las props para `DataTable` (`tableProps`).
 *
 * - **La URL es la fuente de verdad.** Se lee con `useSearchParams` —la página
 *   que monta la lista debe envolverla en `<Suspense>`— y se escribe con
 *   `history.replaceState`, partiendo de la query ACTUAL del navegador (no de
 *   la de este render) para que dos cambios seguidos no se pisen; es el mismo
 *   motivo por el que no se usa `router.replace`, que actualiza la URL de forma
 *   asíncrona (ver `SupplierPurchaseOrderHistory`).
 * - **Nada inválido llega al backend.** Cada valor de la URL se valida por
 *   separado contra `definition`; uno inválido se trata como ausente.
 * - **Cualquier cambio de filtro, búsqueda, orden o tamaño vuelve a la página
 *   1**, en la misma escritura.
 * - **La búsqueda se confirma tras una pausa** (`searchDebounceMs`); Enter y
 *   el botón de limpiar la confirman al instante.
 * - **Errores.** Si falla un refetch de la MISMA consulta, se conservan los
 *   datos y se avisa por toast. Si falla una consulta con parámetros NUEVOS,
 *   no hay datos de esa consulta que conservar: la tabla muestra el error en
 *   su cuerpo (con "Reintentar" y "Limpiar filtros") y el encabezado sigue
 *   montado. La distinción es la de `useGuardedQuery`: mientras la consulta
 *   nueva está en curso se muestran las filas anteriores como placeholder, que
 *   no cuenta como "cargado"; al fallar, el placeholder se retira.
 * - **Página fuera de rango.** Una respuesta vacía con total mayor que cero
 *   lleva a la última página que sí existe; un error que el adaptador reconoce
 *   como "esa página no existe" ofrece volver a la primera.
 *
 * Las mutaciones de una lista en modo servidor INVALIDAN por prefijo
 * (`queryKey`) en vez de escribir la caché de forma optimista: la página a la
 * que pertenece un registro depende de los filtros y del orden.
 */
export function useServerTable<P extends ServerTableFilterParams, TResponse, TRow>({
  definition,
  queryKey,
  queryFn,
  adapter,
  toastId,
  refetchErrorMessage,
  loadErrorMessage = "No se pudo cargar la información.",
  enabled = true,
  disabledMessage = "Aún no se ha hecho la consulta.",
  searchDebounceMs = 300,
  refetchOnMount,
}: UseServerTableOptions<P, TResponse, TRow>) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = readServerTableState(definition, (key) => searchParams.get(key));

  // ── Escritura en la URL ─────────────────────────────────────────────────
  const commit = (update: (current: ServerTableState<P>) => ServerTableState<P>) => {
    const currentQuery = new URLSearchParams(window.location.search);
    const current = readServerTableState(definition, (key) => currentQuery.get(key));
    const next = update(current);
    if (next === current) return;
    // Segunda guarda, por VALOR: un cambio que deja el estado igual (el mismo
    // filtro, la misma búsqueda, el mismo orden o tamaño) no escribe la URL ni
    // toca la página, aunque quien lo pidió haya armado un objeto nuevo.
    const serialize = (state: ServerTableState<P>) =>
      writeServerTableQuery(definition, state, new URLSearchParams()).toString();
    if (serialize(next) === serialize(current)) return;
    const qs = writeServerTableQuery(definition, next, currentQuery).toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const setPage = (page: number) =>
    commit((current) => {
      const next = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      return next === current.page ? current : { ...current, page: next };
    });

  // ── Búsqueda ────────────────────────────────────────────────────────────
  // `draft` es lo que el usuario lleva tecleado; la URL solo recibe el valor
  // confirmado. Mientras hay una confirmación pendiente la URL NO pisa el
  // borrador: Next sincroniza `useSearchParams` con `replaceState` un poco
  // después, y un valor confirmado que llega tarde borraría lo tecleado desde
  // entonces. Fuera de eso, un cambio de la búsqueda en la URL que no venga de
  // este campo (limpiar filtros, navegar atrás) sí se refleja.
  const [draft, setDraft] = useState(state.search);
  const [syncedSearch, setSyncedSearch] = useState(state.search);
  const [isSearchPending, setIsSearchPending] = useState(false);
  if (state.search !== syncedSearch) {
    setSyncedSearch(state.search);
    if (!isSearchPending && state.search !== normalizeServerTableSearch(definition, draft)) {
      setDraft(state.search);
    }
  }
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const commitSearch = (value: string) => {
    setIsSearchPending(false);
    const search = normalizeServerTableSearch(definition, value);
    commit((current) => (current.search === search ? current : { ...current, search, page: 1 }));
  };

  const handleSearchChange = (value: string, mode: "debounced" | "now" = "debounced") => {
    setDraft(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
    if (mode === "now") {
      commitSearch(value);
      return;
    }
    setIsSearchPending(true);
    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      commitSearch(value);
    }, searchDebounceMs);
  };

  // ── Filtros ─────────────────────────────────────────────────────────────
  const writeFilter = (key: string, value: unknown) =>
    commit((current) => {
      const filters: Record<string, unknown> = { ...current.filters };
      if (value === undefined) {
        if (!(key in filters)) return current;
        delete filters[key];
      } else {
        if (filters[key] === value) return current;
        filters[key] = value;
      }
      return { ...current, filters: filters as ServerTableFilterValues<P>, page: 1 };
    });

  /** Desde la tabla: llega el texto de la opción elegida y se valida aquí. */
  const handleFilterChange = (key: string, raw: string | undefined) => {
    if (!Object.prototype.hasOwnProperty.call(definition.filters, key)) return;
    if (raw === undefined) {
      writeFilter(key, undefined);
      return;
    }
    const value = definition.filters[key].parse(raw);
    if (value !== null) writeFilter(key, value);
  };

  /**
   * Para controles FUERA de la tabla (p. ej. un campo de fecha): mismo estado
   * y misma URL que los filtros de encabezado. `undefined` quita el filtro; un
   * valor que su `parse` no acepta se ignora.
   */
  const setFilter = <K extends keyof P & string>(
    key: K,
    value: ServerTableFilterValues<P>[K] | undefined,
  ) => {
    if (value === undefined || value === null) {
      writeFilter(key, undefined);
      return;
    }
    const param = definition.filters[key];
    const parsed = param.parse(param.serialize(value));
    if (parsed !== null) writeFilter(key, parsed);
  };

  /** Quita filtros y búsqueda y vuelve a la página 1 (conserva orden y tamaño). */
  const clear = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
    setIsSearchPending(false);
    setDraft("");
    commit((current) =>
      hasServerTableCriteria(current) || current.page !== 1
        ? { ...current, filters: {} as ServerTableFilterValues<P>, search: "", page: 1 }
        : current,
    );
  };

  // ── Consulta ────────────────────────────────────────────────────────────
  const page = { page: state.page, pageSize: state.pageSize };
  const criteria = toServerTableCriteria(definition, state);
  const request: ServerTableRequest = { ...criteria, ...adapter.paginationParams(page) };

  const listKey = [...queryKey, "list", request];
  const listKeyHash = hashKey(listKey);
  const query = useGuardedQuery<TResponse | PageGone>(
    {
      queryKey: listKey,
      queryFn: async () => {
        try {
          return await queryFn(request);
        } catch (error) {
          // Solo en un REFETCH (ya había datos de esta misma consulta): en la
          // carga inicial el error sigue su camino y la tabla lo muestra.
          if (
            page.page > 1 &&
            adapter.isOutOfRange?.(error) === true &&
            queryClient.getQueryData(listKey) !== undefined
          ) {
            return PAGE_GONE;
          }
          throw error;
        }
      },
      enabled,
      ...(refetchOnMount ? { refetchOnMount } : {}),
      // Un 4xx es determinista (un filtro que el backend rechaza): no se reintenta.
      retry: retryUnlessClientError,
      // Mientras llega la consulta nueva se conservan las filas anteriores,
      // pero solo de ESTA lista (mismo prefijo) y solo con la consulta
      // habilitada: v5 aplica `placeholderData` también a una deshabilitada
      // (ver `useConciliaciones`).
      placeholderData: enabled
        ? (previousData, previousQuery) =>
            previousQuery !== undefined &&
            !isPageGoneData(previousData) &&
            partialMatchKey(previousQuery.queryKey, queryKey)
              ? previousData
              : undefined
        : undefined,
    },
    { toastId, errorMessage: refetchErrorMessage },
  );

  const isPageGone = isPageGoneData(query.data);
  const response = isPageGone ? undefined : (query.data as TResponse | undefined);
  const parsed = response === undefined ? undefined : adapter.parse(response, page);
  const rows: TRow[] = parsed?.rows ?? NO_ROWS;
  const total = parsed?.total;

  // Página vacía con registros en la consulta: el conjunto se encogió (o la
  // URL traía una página que ya no existe). Se va a la última que sí existe.
  const lastPage = total === undefined ? undefined : Math.max(1, Math.ceil(total / state.pageSize));
  // Si lo que ya no existe es la página que se estaba viendo (refetch), se
  // retrocede una: si tampoco existe, esa ya es una carga inicial y la tabla
  // ofrece volver a la primera.
  const pageToClampTo = isPageGone
    ? state.page - 1
    : query.hasLoaded &&
    !query.isPlaceholderData &&
    rows.length === 0 &&
    total !== undefined &&
    total > 0 &&
    lastPage !== undefined &&
    state.page > lastPage
      ? lastPage
      : null;
  // Misma escritura de URL que el paginador (`setPage`), leída al dispararse.
  const goToPage = useEffectEvent(setPage);
  useEffect(() => {
    if (pageToClampTo !== null) goToPage(pageToClampTo);
  }, [pageToClampTo]);
  // El marcador no debe quedarse en caché: al dejar esa página se descarta,
  // para que volver a ella consulte de nuevo en vez de rebotar.
  useEffect(() => {
    if (!isPageGone) return;
    return () => {
      queryClient.removeQueries({ predicate: (cached) => cached.queryHash === listKeyHash });
    };
  }, [isPageGone, listKeyHash, queryClient]);

  // El backend dice que esa página no existe (p. ej. el 404 de `?page=`):
  // reintentar no sirve, lo que sirve es volver a la primera.
  const isOutOfRangeError =
    query.isInitialError && state.page > 1 && adapter.isOutOfRange?.(query.error) === true;

  const ordering = effectiveServerTableOrdering(definition, state.ordering);
  const hasActiveCriteria = hasServerTableCriteria(state);

  const server: DataTableServerMode = {
    pagination: {
      page: state.page,
      pageSize: state.pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: (pageSize) => {
        if (!serverTablePageSizes(definition).includes(pageSize)) return;
        commit((current) =>
          current.pageSize === pageSize ? current : { ...current, pageSize, page: 1 },
        );
      },
      pageSizeOptions: serverTablePageSizes(definition),
    },
    search: definition.search
      ? { value: draft, committedValue: state.search, onChange: handleSearchChange }
      : undefined,
    sorting:
      definition.ordering && ordering !== null
        ? {
            value: ordering,
            fields: definition.ordering.fields,
            onToggle: (field) =>
              commit((current) => {
                const next = nextServerTableOrdering(definition, current.ordering, field);
                return next === current.ordering ? current : { ...current, ordering: next, page: 1 };
              }),
          }
        : undefined,
    filters: {
      values: serializeServerTableFilters(definition, state.filters),
      onChange: handleFilterChange,
      keys: Object.keys(definition.filters),
    },
    hasActiveCriteria,
    onClearCriteria: clear,
    isTransitioning: query.isPlaceholderData,
    idleMessage: enabled ? undefined : disabledMessage,
  };

  return {
    /** Filas de la página actual (las anteriores mientras llega una consulta nueva). */
    rows,
    /** Total de la consulta; `undefined` hasta la primera respuesta. */
    total,
    /** Respuesta cruda, para las claves extra del endpoint (un `resumen`). */
    response,
    /** Estado validado: filtros tipados, búsqueda confirmada, orden, página. */
    state,
    /**
     * Filtros + búsqueda + orden con los nombres del endpoint, SIN paginación:
     * para consultas hermanas sobre el mismo conjunto (totales, exportación).
     */
    criteria,
    hasActiveCriteria,
    setFilter,
    clear,
    /** Hay una consulta con parámetros nuevos en curso. */
    isTransitioning: query.isPlaceholderData,
    refetch: query.refetch,
    /** Para esparcir en `<DataTable columns={...} {...tableProps} />`. */
    tableProps: {
      data: rows,
      server,
      // `isPageGone`: un instante, hasta que el efecto de arriba cambia de página.
      isLoading: query.isLoading || isPageGone,
      isError: query.isInitialError,
      errorMessage: isOutOfRangeError
        ? "Esa página ya no existe con los filtros actuales."
        : extractErrorMessage(query.error, loadErrorMessage),
      onErrorRetry: isOutOfRangeError
        ? () => setPage(1)
        : () => {
            if (enabled) void query.refetch();
          },
      // `refetch()` consulta aunque `enabled` sea `false`: deshabilitada, la
      // barra no ofrece "Actualizar datos".
      onRefetch: enabled ? () => query.refetch() : undefined,
      isRefetching: query.isFetching,
    },
  };
}
