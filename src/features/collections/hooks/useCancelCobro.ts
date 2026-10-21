import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { getCuentaPorCobrarDetail } from "@/src/features/accounts-receivable/services/actions";
import { cancelCobro } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import { cancelCobroErrorMessage, getCobroCancelBlockReason } from "../utils/cobroCancellation";
import { invalidateCobroEffects } from "./cobroQueryCache";
import { useCobroAction } from "./useCobroAction";

/** Candado de la cancelación, ÚNICO por cobro (ver `useCancelCobro`). */
export const cancelCobroMutationKey = (cobroId: number) => ["cancel-cobro", cobroId] as const;

/**
 * Cancela UN cobro (`POST /finanzas/cobros/{id}/cancelar/`), sobre el esqueleto
 * compartido `useCobroAction` (candado por cobro, cobro fresco, escritura en el
 * listado):
 *
 * - Antes del POST pide el cobro FRESCO y, por id, la CxC FRESCA de cada una de
 *   sus líneas, y vuelve a evaluar `getCobroCancelBlockReason`: si mientras el
 *   diálogo estaba abierto el cobro ganó un REP, se canceló, o se canceló una de
 *   sus facturas (o una CxC no se pudo consultar), NO se hace el POST y se avisa
 *   con el motivo. El cobro se escribe en el listado; el listado de CxC se
 *   invalida para que el detalle quede al día.
 * - Al terminar bien, escribe el cobro cancelado en el listado y refresca todo
 *   lo que la reversión mueve (`invalidateCobroEffects`, el mismo conjunto que
 *   registrar un cobro). Ante un error se relee el listado de cobros (un 400 por
 *   REP significa que su estado cambió); si el POST se quedó sin respuesta
 *   (`isActionOutcomeUnknown`), se refresca todo el conjunto.
 */
export const useCancelCobro = (cobroId: number) => {
  const queryClient = useQueryClient();

  const { trigger: cancel, isRunning: isCancelling } = useCobroAction<{ cobro: Cobro }>({
    mutationKey: cancelCobroMutationKey(cobroId),
    cobroId,
    run: async (current) => {
      // Solo las CxC de SUS líneas, en paralelo. Una que no responda (404 si es
      // de otra empresa o no existe, red) queda fuera del índice y la cancelación
      // se bloquea: no se puede saber si su factura está cancelada.
      const cxcIds = [...new Set(current.cobro_detalles.map((linea) => linea.cxc))];
      const settled = await Promise.allSettled(cxcIds.map((id) => getCuentaPorCobrarDetail(id)));
      const cxcIndex = new Map(
        settled.flatMap((result) => (result.status === "fulfilled" ? [[result.value.id, result.value] as const] : [])),
      );
      // No se escribe en la caché del listado de CxC (esta respuesta no es esa
      // lista y una petición en vuelo podría pisarla): se invalida para que el
      // detalle la relea.
      void queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      const blockReason = getCobroCancelBlockReason(current, cxcIndex);
      if (blockReason) throw new PrecheckError(blockReason);
      return { cobro: await cancelCobro(cobroId) };
    },
    onSuccess: ({ cobro }) => {
      invalidateCobroEffects(queryClient);
      toast.success(`Cobro #${cobro.id} cancelado`);
    },
    errorMessage: cancelCobroErrorMessage,
    onError: (outcomeUnknown) => {
      // POST enviado sin respuesta: la reversión pudo aplicarse, así que se
      // refresca TODO lo que mueve, no solo el listado de cobros.
      if (outcomeUnknown) invalidateCobroEffects(queryClient);
      else void queryClient.invalidateQueries({ queryKey: ["cobros"] });
    },
  });

  return { cancel, isCancelling };
};
