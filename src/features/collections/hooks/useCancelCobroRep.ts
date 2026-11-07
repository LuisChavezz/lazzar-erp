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
import { cobroLabel } from "../utils/collection.utils";
import type { SatCancelMotive } from "@/src/constants/satCancelMotives";
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
 *   REP sigue vigente, el backend guardó `rep_cancelacion_solicitada` y el
 *   motivo (que queda fijo para el reintento) y `message` es su texto tal cual.
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
 * - Manda el motivo SAT del diálogo (`motivo_sat`, EC-808): obligatorio en el
 *   disparador (`cancelRep({ variables: { motivoSat }, ... })`). Si el motivo
 *   quedó fijo en otro después de abrir el diálogo, el backend responde 400
 *   `motivo_sat` con el motivo fijo, que se muestra tal cual.
 * - Al TERMINAR, con cualquier resultado, relee `["cobros"]`: es la única caché
 *   que pinta el REP (detalle y columna del listado de cobros, y la sección
 *   "Cobros" del detalle de CxC, que lee el mismo listado). Cancelar el REP no
 *   mueve saldos, banco ni póliza, así que no se invalida nada más.
 */
export const useCancelCobroRep = (cobroId: number) => {
  const queryClient = useQueryClient();

  const { trigger: cancelRep, isRunning: isCancellingRep, isIdle } = useCobroAction<
    CancelCobroRepResult,
    { motivoSat: SatCancelMotive }
  >({
    mutationKey: cancelCobroRepMutationKey(cobroId),
    cobroId,
    run: async (current, { motivoSat }) => {
      if (!isCobroRepCancellable(current)) return { outcome: "not-cancellable", cobro: current };
      try {
        return { outcome: "cancelled", cobro: await cancelCobroRep({ id: cobroId, motivoSat }) };
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
      toast.success(`REP del cobro ${cobroLabel(result.cobro)} cancelado ante el SAT`);
    },
    errorMessage: cancelCobroRepErrorMessage,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
    },
  });

  return { cancelRep, isCancellingRep, isIdle };
};
