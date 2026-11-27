import type { QueryClient } from "@tanstack/react-query";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { mergeCachedRecord, patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import { serverTableListPrefix } from "@/src/utils/serverTableParams";
import type { RfidReconciliationRow } from "../interfaces/rfid-reconciliation.interface";
import { RFID_RECONCILIATIONS_KEY, rfidReconciliationDetailQueryKey } from "../constants/rfidReconciliations";

/** Campos de estatus que `aceptar/` y `cancelar/` responden y se escriben en caché. */
export const RFID_RECONCILIATION_STATUS_FIELDS = [
  "estatus",
  "estatus_label",
  "aceptado_por",
  "aceptado_por_nombre",
  "fecha_aceptacion",
  "motivo_cancelacion",
  "fecha_cancelacion",
  "cancelado_por",
  "cancelado_por_nombre",
  "updated_at",
] as const satisfies readonly (keyof RfidReconciliationRow)[];

/**
 * Escribe el estatus que respondió una acción en cada listado y en el detalle
 * en caché ANTES de invalidar (EC-927): un refetch fallido no deja la fila
 * ofreciendo "Aceptar" o "Cancelar" otra vez. Solo los campos de estatus que
 * trae la respuesta (nunca los totales); best-effort, no lanza.
 */
export const applyRfidReconciliationStatus = async (
  queryClient: QueryClient,
  id: number,
  result: unknown,
) => {
  const values = pickPresentFields<RfidReconciliationRow>(result, RFID_RECONCILIATION_STATUS_FIELDS);
  if (values.estatus === undefined) return;
  await patchCachedRowById<RfidReconciliationRow>(queryClient, RFID_RECONCILIATIONS_KEY, id, (row) => ({
    ...row,
    ...values,
  }));
  await mergeCachedRecord(queryClient, rfidReconciliationDetailQueryKey(id), id, values);
};

/**
 * Lo que cambia un encuadre: sus listados, detalles y el onboarding
 * (`["rfid-reconciliations"]`) y la bitácora (`aceptar/` y `cancelar/` quedan
 * registrados). No toca inventario ni recepciones. Sin esperarse.
 */
export const refreshAfterRfidReconciliationChange = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: RFID_RECONCILIATIONS_KEY });
  void queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
};

/** Tras una tanda de lecturas: solo el detalle (resumen y lecturas), no el listado. */
export const refreshDetailAfterReads = (queryClient: Pick<QueryClient, "invalidateQueries">, id: number) => {
  void queryClient.invalidateQueries({ queryKey: rfidReconciliationDetailQueryKey(id), exact: true });
};

/**
 * Al pausar la lectura o cerrar el detalle: el listado (sus totales cambiaron),
 * una sola vez, en vez de releerlo con cada tanda.
 */
export const refreshListAfterReading = (queryClient: Pick<QueryClient, "invalidateQueries">) => {
  void queryClient.invalidateQueries({ queryKey: serverTableListPrefix(RFID_RECONCILIATIONS_KEY) });
};
