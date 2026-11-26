import type { QueryClient } from "@tanstack/react-query";
import { STOCK_MOVEMENTS_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { mergeCachedRecord, patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import { cancelSupplierReturn } from "../services/actions";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";
import {
  SUPPLIER_RETURNS_KEY,
  supplierReturnDetailQueryKey,
  supplierReturnLabel,
} from "../constants/supplierReturns";

/**
 * Lo que cambia al dar de alta o cancelar una devolución: sus listados,
 * detalles y pendientes (`["supplier-returns"]`), la bandera
 * `tiene_devolucion_pendiente` de Calidad y su selector
 * (`["quality-inspections"]`), el movimiento de inventario de delta 0 que deja
 * (listado de movimientos) y la bitácora. Sin esperarse: el diálogo cierra en
 * cuanto responde el backend.
 */
export const refreshAfterSupplierReturnChange = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: SUPPLIER_RETURNS_KEY });
  void queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
  void queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
};

/** Campos de la cancelación que se escriben en la fila y el detalle en caché. */
const CANCEL_FIELDS = [
  "estatus",
  "motivo_cancelacion",
  "fecha_cancelacion",
  "cancelado_por",
  "cancelado_por_nombre",
] as const satisfies readonly (keyof SupplierReturn)[];

/** Candado por devolución: frena el doble envío. */
export const cancelSupplierReturnMutationKey = (id: number) => ["cancelar-devolucion-proveedor", id] as const;

/**
 * Cancelar una devolución (`{id}/cancelar/`) sobre el diálogo de WMS
 * (`WmsCancelDialog`). Antes de invalidar escribe en caché el estatus que
 * respondió (EC-927), para que un refetch fallido no deje la fila ofreciendo
 * "Cancelar" otra vez. `400 {"estatus"}` (ya cancelada) cierra el diálogo con
 * el mensaje del backend y relee todo.
 */
export const supplierReturnCancelAction = (
  dev: Pick<SupplierReturn, "id" | "folio">,
): WmsCancelAction<SupplierReturn> => ({
  mutationKey: cancelSupplierReturnMutationKey(dev.id),
  run: (motivo) => cancelSupplierReturn({ id: dev.id, motivo }),
  applyResult: async (queryClient, result) => {
    const values = pickPresentFields<SupplierReturn>(result, CANCEL_FIELDS);
    if (values.estatus === undefined) return;
    await patchCachedRowById<SupplierReturn>(queryClient, SUPPLIER_RETURNS_KEY, dev.id, (row) => ({
      ...row,
      ...values,
    }));
    await mergeCachedRecord(queryClient, supplierReturnDetailQueryKey(dev.id), dev.id, values);
  },
  refresh: refreshAfterSupplierReturnChange,
  blockingKeys: ["estatus"],
  successMessage: () => `Devolución ${supplierReturnLabel(dev)} cancelada`,
  fallbackErrorMessage: "Error al cancelar la devolución a proveedor",
});

/** Texto del diálogo de "Cancelar devolución". */
export const supplierReturnCancelDialogContent = (
  dev: Pick<SupplierReturn, "id" | "folio">,
): WmsCancelDialogContent<SupplierReturn> => ({
  action: supplierReturnCancelAction(dev),
  title: "Cancelar devolución",
  description: `La devolución ${supplierReturnLabel(dev)} quedará cancelada y lo que devolvió volverá a estar pendiente de devolver en su inspección de calidad. El inventario no cambia: lo rechazado nunca entró a existencias.`,
  submitLabel: "Cancelar devolución",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la devolución",
});
