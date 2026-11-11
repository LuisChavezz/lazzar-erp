import type { BitacoraDocumento } from "@/src/features/document-audit/interfaces/document-audit.interface";
import { documentAuditErrorMessage } from "@/src/features/document-audit/utils/documentAuditErrors";

/** Consulta de la línea de tiempo, montada por la página (`useDocumentTimeline`). */
export interface OrderHistoryQuery {
  events: BitacoraDocumento[] | undefined;
  /** El backend devolvió solo los 500 eventos más recientes (`truncado`). */
  isTruncated: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isInitialError: boolean;
  /** 404 de `linea-tiempo`: el historial no está disponible. */
  isDefinitiveError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Qué pinta el cuerpo de la hoja "Historial". */
export type OrderHistoryView =
  | { kind: "unavailable" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "events"; events: BitacoraDocumento[]; truncationNotice: string | null };

/**
 * Estado de la hoja a partir de la consulta. Un 404 (`isDefinitiveError`) gana
 * a todo: el documento no es de la empresa y no hay nada que reintentar. Con
 * `truncado`, el aviso dice que faltan los eventos MÁS ANTIGUOS: el backend
 * conserva los 500 más recientes.
 */
export const resolveOrderHistoryView = (history: OrderHistoryQuery): OrderHistoryView => {
  const { events } = history;
  if (history.isDefinitiveError) return { kind: "unavailable" };
  if (history.isLoading && events === undefined) return { kind: "loading" };
  if (history.isInitialError) {
    return {
      kind: "error",
      message: documentAuditErrorMessage(history.error, "No se pudo cargar el historial del pedido."),
    };
  }
  if (!events || events.length === 0) return { kind: "empty" };
  return {
    kind: "events",
    events,
    truncationNotice: history.isTruncated
      ? `Se muestran los ${events.length} eventos más recientes; los anteriores no se incluyen en este historial.`
      : null,
  };
};
