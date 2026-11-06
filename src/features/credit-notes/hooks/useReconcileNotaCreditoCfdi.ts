import {
  mutationOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { toastWarning } from "@/src/utils/toastWarning";
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
 * Mutación que concilia contra Facturama el timbrado sin confirmar de UNA nota
 * (`POST /finanzas/notas-credito/{id}/conciliar-cfdi/`, EC-709). Mismo esquema
 * que `useStampNotaCredito`: candado por nota, retrieve fresco antes del POST
 * (si ya no trae `cfdi_pendiente` no se hace) y, al terminar con cualquier
 * resultado, `invalidateCreditNoteQueries` con scope `stamp`: conciliar solo
 * cambia el timbre, no saldos ni pólizas. La respuesta no se escribe en la
 * caché: el refetch muestra el estado real.
 *
 * Con `aviso` (EC-761) el CFDI de egreso quedó vigente ante el SAT aunque la
 * nota esté cancelada: en lugar del toast de éxito se muestra ese aviso del
 * backend tal cual, como advertencia. No se distinguen casos por su texto.
 */
export const reconcileNotaCreditoCfdiMutationOptions = (
  queryClient: QueryClient,
  notaId: number,
) =>
  mutationOptions<ReconcileNotaCreditoCfdiResult, unknown, void>({
    mutationKey: reconcileNotaCreditoCfdiMutationKey(notaId),
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
      const { resultado, aviso, nota_credito: nota } = result.response;
      if (aviso) {
        toastWarning(aviso);
        return;
      }
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
        `Facturama no tenía ningún CFDI de la nota ${label}: se liberó el timbrado pendiente.`,
      );
    },
    onError: (error) => {
      logUnexpectedError(error);
      toast.error(reconcileNotaCreditoCfdiErrorMessage(error));
    },
    onSettled: () => invalidateCreditNoteQueries(queryClient, "stamp"),
  });

/**
 * Hook de `reconcileNotaCreditoCfdiMutationOptions` (ahí el detalle) con el
 * candado por nota.
 */
export const useReconcileNotaCreditoCfdi = (notaId: number) => {
  const queryClient = useQueryClient();
  const mutationOpts = reconcileNotaCreditoCfdiMutationOptions(queryClient, notaId);
  const { isRunning: isReconciling, isIdle } = useMutationLock(mutationOpts.mutationKey);

  const mutation = useMutation(mutationOpts);

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
