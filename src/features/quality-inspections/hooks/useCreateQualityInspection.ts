import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createQualityInspection } from "../services/actions";
import { QUALITY_INSPECTION_ONBOARDING_KEY } from "./useQualityInspectionOnboarding";
import {
  parseQualityInspectionError,
  type ParsedQualityInspectionError,
} from "../utils/parseQualityInspectionError";
import type { CreateQualityInspectionPayload } from "../interfaces/quality-inspection.interface";

const FALLBACK_ERROR = "Error al registrar la inspección de calidad";

/** Lo usa el diálogo para no cerrarse mientras el POST está en curso. */
export const CREATE_QUALITY_INSPECTION_MUTATION_KEY = ["create-quality-inspection"] as const;

/**
 * Queries que cambian al inspeccionar una recepción. El POST, en una sola
 * transacción: cierra la recepción (`CERRADA`), abona lo aprobado a
 * `Existencia` + `MovimientoInventario`, y recalcula el estatus de su OC/OP
 * (lo rechazado vuelve a quedar pendiente y puede reabrirla).
 */
const AFFECTED_QUERY_KEYS: readonly (readonly string[])[] = [
  QUALITY_INSPECTION_ONBOARDING_KEY,
  // Estatus de la recepción: listado WMS, listado de Compras y su detalle.
  ["receipts"],
  ["purchase-order-receipts"],
  ["receipt-detail"],
  // OC/OP de origen: estatus, picker de "Nueva recepción" y onboarding de OC.
  ["receipt-onboarding-data"],
  ["purchase-orders"],
  ["purchase-order-onboarding"],
  ["production-orders"],
  // Existencias y movimientos de inventario (el onboarding de surtido expone
  // `existencia_*`/`maximo_picking_permitido` por talla).
  ["picking-onboarding"],
  ["stock-items"],
  ["stock-report"],
  ["stock-movement-report"],
  ["stockMovements"],
  ["inventory-pipeline"],
];

interface UseCreateQualityInspectionOptions {
  onSuccess: () => void;
  /** Recibe el error ya repartido por renglón/campo para pintarlo en el form. */
  onServerError: (parsed: ParsedQualityInspectionError) => void;
}

export const useCreateQualityInspection = ({
  onSuccess,
  onServerError,
}: UseCreateQualityInspectionOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CREATE_QUALITY_INSPECTION_MUTATION_KEY,
    mutationFn: (payload: CreateQualityInspectionPayload) => createQualityInspection(payload),
    onSuccess: (data) => {
      AFFECTED_QUERY_KEYS.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
      toast.success(
        `Inspección registrada: ${data.calidad_inspeccion.recepcion_folio} quedó cerrada`,
      );
      onSuccess();
    },
    onError: (error, payload) => {
      const parsed = parseQualityInspectionError(error, payload, FALLBACK_ERROR);
      if (parsed.stale) {
        // La recepción ya no está pendiente: se refresca el listado para que
        // desaparezca (y el diálogo se cierra desde `onServerError`).
        void queryClient.invalidateQueries({ queryKey: QUALITY_INSPECTION_ONBOARDING_KEY });
        void queryClient.invalidateQueries({ queryKey: ["receipts"] });
      }
      toast.error(parsed.message);
      onServerError(parsed);
    },
  });
};
