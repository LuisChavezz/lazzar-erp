import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import type { CancelError } from "@/src/features/document-cancellation/utils/cancelErrors";
import {
  classifyFinanceCancelError,
  financeCancelAction,
  writeCancelledRow,
} from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { cancelarNotaCredito } from "../services/actions";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { fetchFreshNotaCredito } from "../hooks/fetchFreshNotaCredito";
import { invalidateCreditNoteQueries } from "../hooks/invalidateCreditNoteQueries";
import { cancelNotaCreditoErrorMessage, CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE } from "./creditNoteErrors";
import { getCreditNoteCancelBlockReason } from "./creditNoteStamping";

/** Lo mínimo para cancelar y nombrar la nota. */
export type CreditNoteCancelTarget = Pick<NotaCredito, "id" | "folio">;

/** Candado de la cancelación, ÚNICO por nota. */
export const cancelNotaCreditoMutationKey = (id: number) => ["cancelar-nota-credito", id] as const;

const label = (nota: CreditNoteCancelTarget) => nota.folio || `#${nota.id}`;

/**
 * Errores de la cancelación de una nota: la clase la decide
 * `classifyFinanceCancelError` (con `cfdi`: timbrada o con timbrado pendiente) y
 * el texto, salvo el de `motivo`, `cancelNotaCreditoErrorMessage` (el `cfdi`
 * antes que cualquier otro campo, el `403` sin HTML, el corte sin respuesta).
 */
export const classifyCreditNoteCancelError = (error: unknown): CancelError => {
  const classified = classifyFinanceCancelError(error, {
    documentLabel: "la nota de crédito",
    blockingKeys: ["cfdi"],
    unconfirmedMessage: CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE,
  });
  return classified.kind === "motivo" ? classified : { ...classified, message: cancelNotaCreditoErrorMessage(error) };
};

/**
 * "Cancelar nota" con motivo (`POST /finanzas/notas-credito/{id}/cancelar/`,
 * nucleo-erp#1356, EC-950). El motivo va en el BODY: `?motivo=` es el filtro
 * del listado por el campo `motivo` de la nota y daría `404`.
 *
 * Antes del `POST` pide la nota FRESCA y se detiene (`PrecheckError`) si ya
 * está cancelada, timbrada o con el timbrado pendiente
 * (`getCreditNoteCancelBlockReason`). Un `Borrador` sí se cancela: nunca tuvo
 * CFDI. Al terminar relee nota, factura, cuenta por cobrar y pedido
 * (`invalidateCreditNoteQueries`): cancelar una EMITIDA devuelve su importe al
 * saldo de la cuenta por cobrar.
 */
export const creditNoteCancelDialogContent = (
  queryClient: QueryClient,
  nota: CreditNoteCancelTarget,
): CancelDialogContent<NotaCredito> => ({
  action: {
    ...financeCancelAction({
      mutationKey: cancelNotaCreditoMutationKey(nota.id),
      run: async (motivo) => {
        const current = await fetchFreshNotaCredito(queryClient, nota.id);
        if (current.estatus === "Cancelada") throw new PrecheckError(`La nota ${label(current)} ya estaba cancelada.`);
        const blockReason = getCreditNoteCancelBlockReason(current);
        if (blockReason) throw new PrecheckError(blockReason);
        return cancelarNotaCredito(nota.id, motivo);
      },
      applyResult: (client, result) => writeCancelledRow(client, ["credit-notes"], result),
      refresh: (client) => void invalidateCreditNoteQueries(client, "balances"),
      documentLabel: "la nota de crédito",
      successMessage: () => "Nota de crédito cancelada correctamente",
    }),
    classifyError: classifyCreditNoteCancelError,
  },
  title: "Cancelar nota de crédito",
  description: `La nota ${label(nota)} quedará como Cancelada. Si estaba emitida, su importe se devolverá al saldo por cobrar de la factura. La nota se conserva en el listado. Esta acción no se puede deshacer.`,
  submitLabel: "Cancelar nota",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la nota",
});
