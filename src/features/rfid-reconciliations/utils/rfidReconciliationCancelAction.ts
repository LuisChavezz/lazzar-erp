import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { classifyCancelError } from "@/src/features/document-cancellation/utils/cancelErrors";
import { cancelRfidReconciliation } from "../services/actions";
import type { RfidReconciliation, RfidReconciliationBase } from "../interfaces/rfid-reconciliation.interface";
import { rfidReconciliationInlineLabel, rfidReconciliationLabel } from "../constants/rfidReconciliations";
import {
  applyRfidReconciliationStatus,
  refreshAfterRfidReconciliationChange,
} from "./rfidReconciliationCache";

/** Candado por encuadre: frena el doble envío. */
export const cancelRfidReconciliationMutationKey = (id: number) => ["cancelar-encuadre-rfid", id] as const;

type CancelTarget = Pick<RfidReconciliationBase, "id" | "tipo_origen" | "orden_compra_folio" | "op_folio" | "estatus">;

/**
 * "Cancelar encuadre" con motivo (`POST .../{id}/cancelar/`, a lo más 500
 * caracteres), sobre el diálogo compartido `CancelReasonDialog`. Antes de
 * invalidar escribe el estatus que respondió (EC-927).
 *
 * Errores (`classifyCancelError`): `motivo` bajo el campo; `400 {"estatus"}`
 * (ya cancelado) y `400 {"recepcion"}` (hoy inalcanzable, nucleo-erp#1441)
 * cierran con el mensaje del backend y releen; `403`, red o 5xx dejan el
 * diálogo abierto con el motivo escrito.
 */
export const rfidReconciliationCancelDialogContent = (
  target: CancelTarget,
): CancelDialogContent<RfidReconciliation> => ({
  action: {
    mutationKey: cancelRfidReconciliationMutationKey(target.id),
    run: (motivo) => cancelRfidReconciliation({ id: target.id, motivo }),
    applyResult: (queryClient, result) => applyRfidReconciliationStatus(queryClient, target.id, result),
    refresh: refreshAfterRfidReconciliationChange,
    classifyError: (error) =>
      classifyCancelError(error, {
        blockingKeys: ["estatus", "recepcion"],
        messages: {
          fallback: "No se pudo cancelar el encuadre.",
          notFound: "El encuadre ya no está disponible.",
          forbidden: "No tienes permiso para cancelar encuadres.",
        },
      }),
    successMessage: () => `${rfidReconciliationLabel(target)} cancelado`,
  },
  title: "Cancelar encuadre",
  description:
    target.estatus === "ACEPTADO"
      ? `El ${rfidReconciliationInlineLabel(target)} ya está aceptado; quedará cancelado y su conteo dejará de valer. No mueve inventario ni toca recepciones.`
      : `El ${rfidReconciliationInlineLabel(target)} quedará cancelado y ya no se podrá escanear ni aceptar. No mueve inventario.`,
  submitLabel: "Cancelar encuadre",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela el encuadre",
});
