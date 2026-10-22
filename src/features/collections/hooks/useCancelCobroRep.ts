import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cancelacionPendienteMessage } from "@/src/utils/cancelacionPendienteMessage";
import { toastWarning } from "@/src/utils/toastWarning";
import { cancelCobroRep } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import {
  cancelCobroRepErrorMessage,
  getCobroRepNotCancellableMessage,
  isCobroRepCancellable,
} from "../utils/cobroRepCancellation";
import { useCobroAction } from "./useCobroAction";

/** Candado de la cancelación del REP, ÚNICO por cobro (ver `useCancelCobroRep`). */
export const cancelCobroRepMutationKey = (cobroId: number) => ["cancel-cobro-rep", cobroId] as const;

/**
 * Resultado de cancelar el REP:
 * - `cancelled`: el SAT lo canceló; `cobro` ya viene sin `rep_*`.
 * - `not-cancellable`: el retrieve previo ya no traía un REP que cancelar y NO
 *   se hizo el POST.
 * - `requested`: el SAT dejó la cancelación pendiente de que el receptor la
 *   acepte (`cancelacion_pendiente`). No es un éxito, pero tampoco un fallo: el
 *   REP sigue vigente, el backend no guardó nada y `message` es su texto tal cual.
 */
export type CancelCobroRepResult =
  | { outcome: "cancelled"; cobro: Cobro }
  | { outcome: "not-cancellable"; cobro: Cobro }
  | { outcome: "requested"; cobro: Cobro; message: string };

/**
 * Cancela el REP de UN cobro ante el SAT (`POST /finanzas/cobros/{id}/cancelar-rep/`),
 * sobre el esqueleto compartido `useCobroAction` (candado por cobro, cobro
 * fresco, escritura en el listado):
 *
 * - Antes del POST pide el retrieve FRESCO: si ya no tiene un REP cancelable
 *   (`isCobroRepCancellable`), NO hace el POST.
 * - Al TERMINAR, con cualquier resultado, relee `["cobros"]`: es la única caché
 *   que pinta el REP (detalle y columna del listado de cobros, y la sección
 *   "Cobros" del detalle de CxC, que lee el mismo listado). Cancelar el REP no
 *   mueve saldos, banco ni póliza, así que no se invalida nada más.
 */
export const useCancelCobroRep = (cobroId: number) => {
  const queryClient = useQueryClient();

  const { trigger: cancelRep, isRunning: isCancellingRep } = useCobroAction<CancelCobroRepResult>({
    mutationKey: cancelCobroRepMutationKey(cobroId),
    cobroId,
    run: async (current) => {
      if (!isCobroRepCancellable(current)) return { outcome: "not-cancellable", cobro: current };
      try {
        return { outcome: "cancelled", cobro: await cancelCobroRep(cobroId) };
      } catch (error) {
        const message = cancelacionPendienteMessage(error);
        if (message) return { outcome: "requested", cobro: current, message };
        throw error;
      }
    },
    onSuccess: (result) => {
      if (result.outcome === "requested") {
        toastWarning(result.message);
        return;
      }
      if (result.outcome === "not-cancellable") {
        toast.error(getCobroRepNotCancellableMessage(result.cobro));
        return;
      }
      toast.success(`REP del cobro #${result.cobro.id} cancelado ante el SAT`);
    },
    errorMessage: cancelCobroRepErrorMessage,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
    },
  });

  return { cancelRep, isCancellingRep };
};
