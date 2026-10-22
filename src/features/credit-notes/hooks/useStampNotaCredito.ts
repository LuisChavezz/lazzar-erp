import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { timbrarNotaCredito } from "../services/actions";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import {
  CREDIT_NOTE_STAMP_PENDING_MESSAGE,
  isCreditNoteStampPending,
  isCreditNoteStampable,
} from "../utils/creditNoteStamping";
import { logUnexpectedError, stampNotaCreditoErrorMessage } from "../utils/creditNoteErrors";
import { invalidateCreditNoteQueries } from "./invalidateCreditNoteQueries";
import { fetchFreshNotaCredito } from "./fetchFreshNotaCredito";

/** Candado del timbrado, ÚNICO por nota (ver `useStampNotaCredito`). */
export const stampNotaCreditoMutationKey = (notaId: number) =>
  ["stamp-credit-note", notaId] as const;

/**
 * Resultado de timbrar. `not-stampable`: el retrieve previo encontró la nota ya
 * timbrada, con un timbrado pendiente de confirmación o ya no `Emitida`, y NO
 * se hizo el POST.
 */
export type StampNotaCreditoResult =
  | { outcome: "stamped"; nota: NotaCredito }
  | { outcome: "not-stampable"; nota: NotaCredito };

/**
 * Timbra el CFDI de egreso de UNA nota (`POST /finanzas/notas-credito/{id}/timbrar/`),
 * un acto fiscal irreversible. Mismo esquema que `useStampInvoice`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   NOTA (`useMutationLock`).
 * - Antes del POST pide el retrieve fresco: si la nota ya trae `cfdi_uuid`,
 *   `cfdi_pendiente` o dejó de ser `Emitida`, NO se hace el POST y se avisa.
 * - Al terminar, con cualquier resultado, `invalidateCreditNoteQueries`.
 *
 * Errores: toast con el mensaje del backend tal cual, `cfdi` → `estatus` →
 * genérico (`stampNotaCreditoErrorMessage`); sin respuesta o 5xx, un aviso de
 * timbrado sin confirmar en lugar del cuerpo.
 */
export const useStampNotaCredito = (notaId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = stampNotaCreditoMutationKey(notaId);
  const { isRunning: isStamping, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<StampNotaCreditoResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      const current = await fetchFreshNotaCredito(queryClient, notaId);
      if (!isCreditNoteStampable(current)) {
        return { outcome: "not-stampable", nota: current };
      }
      const nota = await timbrarNotaCredito(notaId);
      return { outcome: "stamped", nota };
    },
    onSuccess: ({ outcome, nota }) => {
      const label = nota.folio || `#${nota.id}`;
      if (outcome === "not-stampable") {
        toast.error(
          nota.cfdi_uuid
            ? `La nota ${label} ya estaba timbrada (UUID ${nota.cfdi_uuid}).`
            : isCreditNoteStampPending(nota)
              ? CREDIT_NOTE_STAMP_PENDING_MESSAGE
              : `La nota ${label} ya no puede timbrarse.`,
        );
        return;
      }
      toast.success(
        nota.cfdi_uuid
          ? `Nota ${label} timbrada. UUID ${nota.cfdi_uuid}`
          : `Nota ${label} timbrada`,
      );
    },
    onError: (error) => {
      logUnexpectedError(error);
      toast.error(stampNotaCreditoErrorMessage(error));
    },
    // También ante un error: un timeout pudo dejar la nota `cfdi_pendiente`, y
    // el refetch lo muestra.
    onSettled: () => invalidateCreditNoteQueries(queryClient, "stamp"),
  });

  /**
   * Dispara el timbrado salvo que ya haya uno en vuelo para ESTA nota (consulta
   * síncrona a la caché). `onSettled` corre al terminar, con cualquier resultado.
   */
  const stamp = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { stamp, isStamping };
};
