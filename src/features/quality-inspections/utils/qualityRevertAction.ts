import type { QueryClient } from "@tanstack/react-query";
import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
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
 * Escribe en caché la inspección anulada y el estatus al que volvió la
 * recepción ANTES de invalidar (EC-927), y después invalida lo mismo que al
 * inspeccionar (`QUALITY_INSPECTION_AFFECTED_QUERY_KEYS`: bandeja, recepciones,
 * OC/OP y onboarding de surtido). La mutación compartida invalida además
 * existencias y la bitácora. Best-effort: los helpers de `cachedRows` no lanzan.
 */
const applyRevertResult = async (
  queryClient: QueryClient,
  inspectionId: number,
  receptionId: number,
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
  }
  await Promise.all(
    QUALITY_INSPECTION_AFFECTED_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
};

/** Revertir una inspección de calidad (EC-947), sobre el diálogo de WMS. */
export const qualityRevertAction = (
  inspection: Pick<QualityInspection, "id" | "recepcion" | "recepcion_folio">,
): WmsCancelAction<RevertQualityInspectionResponse> => ({
  mutationKey: revertQualityInspectionMutationKey(inspection.id),
  run: (motivo) => revertQualityInspection({ id: inspection.id, motivo }),
  applyResult: (queryClient, result) => applyRevertResult(queryClient, inspection.id, inspection.recepcion, result),
  successMessage: () => `Calidad revertida: ${inspection.recepcion_folio} volvió a En calidad`,
  fallbackErrorMessage: "Error al revertir la inspección de calidad",
});

/** Texto del diálogo de "Revertir calidad". */
export const qualityRevertDialogContent = (
  inspection: Pick<QualityInspection, "id" | "recepcion" | "recepcion_folio">,
  onSuccess?: () => void,
): WmsCancelDialogContent<RevertQualityInspectionResponse> => ({
  action: qualityRevertAction(inspection),
  title: "Revertir calidad",
  description: `Lo que se liberó con esta inspección saldrá del almacén al mismo costo con que entró, la inspección quedará anulada y la recepción ${inspection.recepcion_folio} volverá a En calidad para inspeccionarse de nuevo o cancelarse.`,
  submitLabel: "Revertir calidad",
  pendingLabel: "Revirtiendo…",
  motivoPlaceholder: "Explica por qué se revierte la inspección",
  onSuccess: onSuccess ? () => onSuccess() : undefined,
});
