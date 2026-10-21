import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PrecheckError, toPrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";
import { getCuentasPorCobrar } from "@/src/features/accounts-receivable/services/actions";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { cancelCobro, getCobro } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import { buildCxcIndex } from "../utils/collection.utils";
import { cancelCobroErrorMessage, getCobroCancelBlockReason } from "../utils/cobroCancellation";
import { invalidateCobroEffects, writeCobroToList } from "./cobroQueryCache";

/** Candado de la cancelación, ÚNICO por cobro (ver `useCancelCobro`). */
export const cancelCobroMutationKey = (cobroId: number) => ["cancel-cobro", cobroId] as const;

/**
 * Cancela UN cobro (`POST /finanzas/cobros/{id}/cancelar/`). Mismo esquema que
 * `useStampCobroRep` y la cancelación de facturas:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   COBRO (`useMutationLock`).
 * - Antes del POST pide el cobro FRESCO y el listado FRESCO de CxC, y vuelve a
 *   evaluar `getCobroCancelBlockReason`: si mientras el diálogo estaba abierto
 *   el cobro ganó un REP, se canceló, o se canceló una de sus facturas, NO se
 *   hace el POST y se avisa con el motivo. Ambas lecturas se escriben en la
 *   caché, así que el detalle también queda al día.
 * - Al terminar bien, escribe el cobro cancelado en el listado y refresca todo
 *   lo que la reversión mueve (`invalidateCobroEffects`, el mismo conjunto que
 *   registrar un cobro). Ante un error se relee el listado de cobros: un 400 por
 *   REP significa que su estado cambió.
 */
export const useCancelCobro = (cobroId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelCobroMutationKey(cobroId);
  const { isRunning: isCancelling, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<Cobro, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      let current: Cobro;
      let cuentas: CuentaPorCobrar[];
      try {
        [current, cuentas] = await Promise.all([getCobro(cobroId), getCuentasPorCobrar()]);
      } catch (error) {
        throw toPrecheckError(error, "No se pudo consultar el cobro.");
      }
      writeCobroToList(queryClient, current);
      // La misma entrada de caché que lee el detalle (`useCuentasPorCobrar()`).
      queryClient.setQueryData(["accounts-receivable", {}], cuentas);
      const blockReason = getCobroCancelBlockReason(current, buildCxcIndex(cuentas));
      if (blockReason) throw new PrecheckError(blockReason);
      return cancelCobro(cobroId);
    },
    onSuccess: (cobro) => {
      writeCobroToList(queryClient, cobro);
      invalidateCobroEffects(queryClient);
      toast.success(`Cobro #${cobro.id} cancelado`);
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
      toast.error(error instanceof PrecheckError ? error.message : cancelCobroErrorMessage(error));
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTE cobro.
   * `onSettled` corre al terminar, con cualquier resultado.
   */
  const cancel = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { cancel, isCancelling };
};
