import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { financeCancelAction, writeCancelledRow } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { cancelarPoliza, type CancelarPolizaResponse } from "../services/actions";
import type { Poliza } from "../interfaces/poliza.interface";
import { cancelarPolizaDescription } from "./cancelarPolizaCopy";

/**
 * Prefijo de la llave de la cancelación: `usePendingPolizaIds` lee de él las
 * pólizas en vuelo (el id va en el segundo segmento, `selectMutationRecordId`).
 */
export const cancelarPolizaMutationKey = ["cancelar-poliza"] as const;

/** Lo mínimo para cancelar y describir la póliza. */
export type PolizaCancelTarget = Pick<Poliza, "id" | "folio" | "estatus">;

/**
 * "Cancelar póliza" con motivo (`POST /finanzas/polizas/{id}/cancelar/`,
 * nucleo-erp#1356, EC-950; exige `CANCELAR-FIN-POLIZAS`). ES LA ÚNICA VÍA: nunca
 * un `PATCH { estatus }`, el camino que contabilizaría una póliza descuadrada.
 * Un `Borrador` solo cambia de estatus; una `Contabilizada` genera además una
 * contrapóliza (`contrapoliza_id`), que aparece con el refetch. El texto sale
 * del estatus con que se ABRIÓ el diálogo.
 */
export const polizaCancelDialogContent = (
  poliza: PolizaCancelTarget,
  etiqueta: string,
): CancelDialogContent<CancelarPolizaResponse> => ({
  action: financeCancelAction({
    mutationKey: [...cancelarPolizaMutationKey, poliza.id],
    run: (motivo) => cancelarPoliza(poliza.id, motivo),
    // Solo estatus y datos de la cancelación (EC-927); la contrapóliza llega con el refetch.
    applyResult: (queryClient, result) => writeCancelledRow(queryClient, ["polizas"], result),
    refresh: (queryClient) => void queryClient.invalidateQueries({ queryKey: ["polizas"] }),
    documentLabel: "la póliza",
    successMessage: (result) =>
      typeof result?.contrapoliza_id === "number"
        ? "Póliza cancelada. Se generó una contrapóliza que revierte el asiento."
        : "Póliza cancelada correctamente",
  }),
  title: "Cancelar póliza",
  description: cancelarPolizaDescription(etiqueta, poliza.estatus),
  submitLabel: "Cancelar póliza",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la póliza",
});
