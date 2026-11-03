import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { conciliarCfdiNotaCredito } from "../services/actions";
import type {
  NotaCredito,
  NotaCreditoCfdiReconcileResponse,
} from "../interfaces/credit-note.interface";
import { isCreditNoteStampPending } from "../utils/creditNoteStamping";
import {
  logUnexpectedError,
  reconcileNotaCreditoCfdiErrorMessage,
} from "../utils/creditNoteErrors";
import { invalidateCreditNoteQueries } from "./invalidateCreditNoteQueries";
import { fetchFreshNotaCredito } from "./fetchFreshNotaCredito";

/** Candado de la conciliación, ÚNICO por nota (ver `useReconcileNotaCreditoCfdi`). */
export const reconcileNotaCreditoCfdiMutationKey = (notaId: number) =>
  ["reconcile-credit-note-cfdi", notaId] as const;

/**
 * Resultado de conciliar. `not-pending`: el retrieve previo encontró la nota
 * ya sin timbrado pendiente y NO se hizo el POST.
 */
export type ReconcileNotaCreditoCfdiResult =
  | { outcome: "reconciled"; response: NotaCreditoCfdiReconcileResponse }
  | { outcome: "not-pending"; nota: NotaCredito };

/**
 * Concilia contra Facturama el timbrado sin confirmar de UNA nota
 * (`POST /finanzas/notas-credito/{id}/conciliar-cfdi/`, EC-709). Mismo esquema
 * que `useStampNotaCredito`: candado por nota, retrieve fresco antes del POST
 * (si ya no trae `cfdi_pendiente` no se hace) y, al terminar con cualquier
 * resultado, `invalidateCreditNoteQueries` con scope `stamp`: conciliar solo
 * cambia el timbre, no saldos ni pólizas. La respuesta no se escribe en la
 * caché: el refetch muestra el estado real.
 */
export const useReconcileNotaCreditoCfdi = (notaId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = reconcileNotaCreditoCfdiMutationKey(notaId);
  const { isRunning: isReconciling, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<ReconcileNotaCreditoCfdiResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      const current = await fetchFreshNotaCredito(queryClient, notaId);
      if (!isCreditNoteStampPending(current)) return { outcome: "not-pending", nota: current };
      const response = await conciliarCfdiNotaCredito(notaId);
      return { outcome: "reconciled", response };
    },
    onSuccess: (result) => {
      if (result.outcome === "not-pending") {
        const label = result.nota.folio || `#${result.nota.id}`;
        toast.error(`La nota ${label} ya no tiene un timbrado pendiente de confirmación.`);
        return;
      }
      const { resultado, nota_credito: nota } = result.response;
      const label = nota.folio || `#${nota.id}`;
      if (resultado === "timbrado") {
        toast.success(
          nota.cfdi_uuid
            ? `El CFDI de la nota ${label} sí existía en Facturama: la nota ya está timbrada. UUID ${nota.cfdi_uuid}`
            : `El CFDI de la nota ${label} sí existía en Facturama: la nota ya está timbrada.`,
        );
        return;
      }
      toast.success(
        `Facturama no tenía ningún CFDI de la nota ${label}: el timbrado pendiente se liberó y ya puedes timbrarla o cancelarla.`,
      );
    },
    onError: (error) => {
      logUnexpectedError(error);
      toast.error(reconcileNotaCreditoCfdiErrorMessage(error));
    },
    onSettled: () => invalidateCreditNoteQueries(queryClient, "stamp"),
  });

  /**
   * Dispara la conciliación salvo que ya haya una en vuelo para ESTA nota
   * (consulta síncrona a la caché). `onSettled` corre al terminar.
   */
  const reconcile = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { reconcile, isReconciling, isIdle };
};
