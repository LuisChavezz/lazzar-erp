import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import type { BitacoraDocumentoPage } from "../interfaces/document-audit.interface";
import { getDocumentAuditPage } from "../services/actions";
import { extractAuditCursor } from "../utils/auditCursor";
import { retryDocumentAuditQuery } from "../utils/documentAuditErrors";

/**
 * Frescura corta: la bitácora crece con cada cambio de documento, y volver a la
 * pantalla con la caché de 15 min del `QueryClient` escondería lo recién
 * registrado.
 */
export const DOCUMENT_AUDIT_STALE_TIME = 30_000;

/** Prefijo de las llaves de la bitácora (listado y líneas de tiempo). */
export const DOCUMENT_AUDIT_QUERY_KEY = ["document-audit"] as const;

/**
 * Bitácora de documentos con "Cargar más" (`useInfiniteQuery` sobre el cursor
 * de DRF). Cada página sigue al `cursor` extraído del `next` de la anterior.
 *
 * - `params`: filtros ya validados (`toDocumentAuditParams`); `null` apaga la
 *   consulta (nunca se manda un filtro inválido). Van en la llave, junto con la
 *   empresa: otra combinación es otra lista que empieza en su primera página.
 * - Al cambiar de filtros se siguen viendo las filas anteriores, atenuadas
 *   (`isTransitioning`), hasta que llega la nueva primera página.
 * - Mismo contrato de errores que `useGuardedQuery`: `isInitialError` solo si
 *   esta combinación nunca cargó; un refetch fallido con datos conserva las
 *   filas y avisa por toast. Un fallo al CARGAR MÁS no avisa por toast: se
 *   expone en `isLoadMoreError` para mostrarlo junto al botón, con las filas ya
 *   cargadas intactas.
 */
export const useDocumentAuditList = (
  params: Record<string, string> | null,
  companyId: number | null,
  { enabled }: { enabled: boolean },
) => {
  const queryClient = useQueryClient();
  const queryKey = [...DOCUMENT_AUDIT_QUERY_KEY, "list", companyId, params];
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => getDocumentAuditPage(params ?? {}, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => extractAuditCursor(lastPage.next),
    enabled: enabled && params !== null && companyId !== null,
    staleTime: DOCUMENT_AUDIT_STALE_TIME,
    retry: retryDocumentAuditQuery,
    placeholderData: keepPreviousData,
  });

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data: query.isPlaceholderData ? undefined : query.data,
    isError: query.isError && !query.isFetchNextPageError,
    errorUpdatedAt: query.errorUpdatedAt,
    toastId: "document-audit-list-refetch-error",
  });

  return {
    rows: query.data?.pages.flatMap((page) => page.results) ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    /** Filas de la combinación anterior mientras llega la nueva. */
    isTransitioning: query.isPlaceholderData,
    isInitialError,
    error: isInitialError ? query.error : null,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoadMoreError: query.isFetchNextPageError,
    loadMore: () => query.fetchNextPage(),
    refetch: () => query.refetch(),
    /**
     * "Actualizar": vuelve a la PRIMERA página. `refetch` de una consulta
     * infinita repite, una tras otra, todas las páginas ya cargadas; aquí se
     * recorta la caché a la primera y solo esa se vuelve a pedir (una
     * petición). Lo más reciente está en esa página; "Cargar más" sigue desde ahí.
     */
    refreshFirstPage: () => {
      queryClient.setQueryData<InfiniteData<BitacoraDocumentoPage, string | null>>(
        queryKey,
        (data) =>
          data && { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) },
      );
      return query.refetch();
    },
  };
};
