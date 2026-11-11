import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getDocumentTimeline } from "../services/actions";
import { isValidTimelineTarget } from "../schemas/documentAuditFilters.schema";
import { DOCUMENT_AUDIT_QUERY_KEY, DOCUMENT_AUDIT_STALE_TIME } from "./useDocumentAuditList";

/**
 * Línea de tiempo de un documento (`linea-tiempo`): su historia y la de los
 * documentos que derivan de él.
 *
 * `enabled` lo decide quien la monta (p. ej. la hoja "Historial" activa Y el
 * permiso de la bitácora): sin él no sale ninguna petición. Tampoco sale con
 * un `tipo` vacío o un id no positivo, que el backend respondería con 400.
 * La empresa va en la llave porque el backend acota por la empresa activa.
 */
export const useDocumentTimeline = (
  tipo: string,
  documentoId: number,
  companyId: number | null,
  { enabled }: { enabled: boolean },
) => {
  const { data, isLoading, isFetching, isInitialError, error, refetch } = useGuardedQuery(
    {
      queryKey: [...DOCUMENT_AUDIT_QUERY_KEY, "timeline", companyId, tipo, documentoId],
      queryFn: ({ signal }) => getDocumentTimeline(tipo, documentoId, signal),
      enabled: enabled && companyId !== null && isValidTimelineTarget(tipo, documentoId),
      staleTime: DOCUMENT_AUDIT_STALE_TIME,
    },
    { toastId: "document-timeline-refetch-error" },
  );

  return {
    /** `undefined` hasta la primera respuesta: distingue "cargando" de "sin eventos". */
    events: data?.eventos,
    /** El backend dejó fuera los eventos más antiguos (había más de 500). */
    isTruncated: data?.truncado ?? false,
    isLoading,
    isFetching,
    isInitialError,
    error,
    refetch,
  };
};
