import type { QueryClient } from "@tanstack/react-query";
import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { mergeCachedRecord, patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import { getReceiptEstatusLabel } from "@/src/features/receipts/constants/receiptStatus";
import { receiptDetailQueryKey } from "@/src/features/receipts/hooks/useReceiptDetail";
import { writePurchaseOrderStatus } from "@/src/features/purchase-orders/utils/purchaseOrderStatusCache";
import { QUALITY_INSPECTION_AFFECTED_QUERY_KEYS } from "../hooks/useCreateQualityInspection";
import { revertQualityInspection } from "../services/actions";
import type {
  QualityInspection,
  RevertQualityInspectionResponse,
} from "../interfaces/quality-inspection.interface";

/** `Recepcion.EstatusRecepcion.CERRADA`: la que cerró la inspección. */
const RECEPCION_CERRADA = 5;

/**
 * ¿Se ofrece "Revertir calidad"? (EC-947). Con lo que trae la fila de
 * "Inspeccionadas": la inspección no está anulada y su recepción, leída del
 * listado de recepciones que la vista ya carga, sigue Cerrada (5). Sin la
 * recepción a la mano (aún no carga) no se ofrece. El resto de las reglas (OC
 * con el saldo cerrado, OP completada, factura de proveedor viva, existencia
 * insuficiente) las aplica el backend y su `400` se muestra tal cual. Quién
 * (admin) lo decide la vista.
 */
export const isQualityInspectionRevertible = (
  inspection: Pick<QualityInspection, "estado">,
  receptionEstatus: number | null | undefined,
): boolean => inspection.estado !== "anulada" && receptionEstatus === RECEPCION_CERRADA;

/**
 * Llaves del `400` con que `revertir/` dice que ya no procede: inspección ya
 * anulada, recepción no cerrada, OC con el saldo cerrado, OP completada,
 * factura de proveedor viva o existencia insuficiente. Cierran el diálogo con el
 * mensaje del backend tal cual y releen la bandeja (`blockingKeys`).
 */
export const QUALITY_REVERT_BLOCKING_KEYS = [
  "estado",
  "recepcion",
  "orden_compra",
  "op",
  "facturas_proveedores",
  "existencia",
] as const;

/** Candado por inspección. */
export const revertQualityInspectionMutationKey = (inspectionId: number) =>
  ["revertir-calidad", inspectionId] as const;

/** Campos de la reversa que se escriben en la fila de "Inspeccionadas". */
const REVERT_FIELDS = [
  "estado",
  "estado_label",
  "motivo_anulacion",
  "fecha_anulacion",
  "anulada_por",
] as const satisfies readonly (keyof QualityInspection)[];

/**
 * Escribe en caché lo que respondió la reversa ANTES de invalidar (EC-927): la
 * inspección anulada (su fila), el estatus al que volvió la recepción (su fila
 * del listado y su detail `["receipt-detail", id]`) y el de su OC (filas del
 * listado y detalle). La respuesta trae `orden_compra_estatus` pero no el id de
 * la OC: lo da `orden_compra` de la fila de la recepción (`ordenCompraId`);
 * sin él (recepción de OP, o el listado aún no carga) la OC solo se invalida.
 * Best-effort: los helpers de `cachedRows` no lanzan. Las invalidaciones van
 * aparte, en `refreshAfterQualityRevert`, sin esperarse.
 */
const applyRevertResult = async (
  queryClient: QueryClient,
  inspectionId: number,
  receptionId: number,
  ordenCompraId: number | null,
  result: RevertQualityInspectionResponse,
) => {
  const values = pickPresentFields<QualityInspection>(result?.calidad_inspeccion, REVERT_FIELDS);
  if (values.estado !== undefined) {
    await patchCachedRowById<QualityInspection>(queryClient, ["quality-inspections"], inspectionId, (row) => ({
      ...row,
      ...values,
    }));
  }
  if (typeof result?.recepcion_estatus === "number") {
    await patchCachedRowById<{ id: number; estatus: number }>(queryClient, ["receipts"], receptionId, (row) => ({
      ...row,
      estatus: result.recepcion_estatus,
    }));
    await mergeCachedRecord(queryClient, receiptDetailQueryKey(receptionId), receptionId, {
      estatus: result.recepcion_estatus,
      estatus_label: getReceiptEstatusLabel(result.recepcion_estatus),
    });
  }
  if (ordenCompraId !== null && typeof result?.orden_compra_estatus === "number") {
    await writePurchaseOrderStatus(queryClient, { id: ordenCompraId, estatus: result.orden_compra_estatus }, [
      "estatus",
    ]);
  }
};

/**
 * Lo mismo que cambia al inspeccionar (`QUALITY_INSPECTION_AFFECTED_QUERY_KEYS`:
 * bandeja, recepciones, OC/OP y onboarding de surtido); la mutación compartida
 * invalida además existencias y la bitácora. Sin esperar los refetch, como
 * `invalidateAfterWmsCancellation`: el diálogo cierra en cuanto responde el
 * backend y se escribe la caché.
 */
const refreshAfterQualityRevert = (queryClient: QueryClient) => {
  for (const queryKey of QUALITY_INSPECTION_AFFECTED_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
};

/**
 * Revertir una inspección de calidad (EC-947), sobre el diálogo de WMS.
 * `ordenCompraId`: la OC de la recepción (`orden_compra` de su fila en el
 * listado de recepciones), para escribir su estatus en caché; `null` si no se
 * conoce.
 */
export const qualityRevertAction = (
  inspection: Pick<QualityInspection, "id" | "recepcion" | "recepcion_folio">,
  ordenCompraId: number | null = null,
): WmsCancelAction<RevertQualityInspectionResponse> => ({
  mutationKey: revertQualityInspectionMutationKey(inspection.id),
  run: (motivo) => revertQualityInspection({ id: inspection.id, motivo }),
  applyResult: (queryClient, result) =>
    applyRevertResult(queryClient, inspection.id, inspection.recepcion, ordenCompraId, result),
  refresh: refreshAfterQualityRevert,
  blockingKeys: QUALITY_REVERT_BLOCKING_KEYS,
  successMessage: () => `Calidad revertida: ${inspection.recepcion_folio} volvió a En calidad`,
  fallbackErrorMessage: "Error al revertir la inspección de calidad",
});

/** Texto del diálogo de "Revertir calidad". */
export const qualityRevertDialogContent = (
  inspection: Pick<QualityInspection, "id" | "recepcion" | "recepcion_folio">,
  ordenCompraId: number | null,
  onSuccess?: () => void,
): WmsCancelDialogContent<RevertQualityInspectionResponse> => ({
  action: qualityRevertAction(inspection, ordenCompraId),
  title: "Revertir calidad",
  description: `Lo que se liberó con esta inspección saldrá del almacén al mismo costo con que entró, la inspección quedará anulada y la recepción ${inspection.recepcion_folio} volverá a En calidad para inspeccionarse de nuevo o cancelarse.`,
  submitLabel: "Revertir calidad",
  pendingLabel: "Revirtiendo…",
  motivoPlaceholder: "Explica por qué se revierte la inspección",
  onSuccess: onSuccess ? () => onSuccess() : undefined,
});
