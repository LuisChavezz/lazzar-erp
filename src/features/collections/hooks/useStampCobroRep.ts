import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { stampCobroRep } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import { useCobroAction } from "./useCobroAction";
import {
  COBRO_REP_PENDING_MESSAGE,
  isCobroRepPending,
  isCobroRepStampable,
  stampCobroRepErrorMessage,
} from "../utils/cobroRepStamping";

/** Candado del timbrado del REP, ÚNICO por cobro (ver `useStampCobroRep`). */
export const stampCobroRepMutationKey = (cobroId: number) => ["stamp-cobro-rep", cobroId] as const;

/**
 * Resultado de timbrar. `not-stampable`: el retrieve previo encontró el cobro
 * ya con REP, con un timbrado pendiente de confirmación, o ya no `Aplicado` y
 * activo, y NO se hizo el POST.
 */
export type StampCobroRepResult =
  | { outcome: "stamped"; cobro: Cobro }
  | { outcome: "not-stampable"; cobro: Cobro };

/**
 * Timbra el REP de UN cobro (`POST /finanzas/cobros/{id}/timbrar-rep/`), un
 * acto fiscal irreversible. Mismo esquema que `useStampInvoice` (Facturación),
 * sobre el esqueleto compartido `useCobroAction`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   COBRO (`useMutationLock`).
 * - Antes del POST pide el retrieve FRESCO del cobro: si ya trae `rep_uuid`,
 *   `rep_pendiente` o dejó de ser un `Aplicado` activo, NO hace el POST.
 * - El cobro del precheck y el de la respuesta 200 se escriben en el listado en
 *   caché (`writeCobroToList`).
 * - Al TERMINAR, con cualquier resultado, refresca el listado de cobros: un 400
 *   por falla de Facturama también deja `rep_pendiente` guardado. El REP no
 *   toca saldos, banco ni póliza, así que no se invalida nada más.
 */
export const useStampCobroRep = (cobroId: number) => {
  const queryClient = useQueryClient();

  const { trigger: stamp, isRunning: isStamping } = useCobroAction<StampCobroRepResult>({
    mutationKey: stampCobroRepMutationKey(cobroId),
    cobroId,
    run: async (current) => {
      if (!isCobroRepStampable(current)) return { outcome: "not-stampable", cobro: current };
      return { outcome: "stamped", cobro: await stampCobroRep(cobroId) };
    },
    onSuccess: ({ outcome, cobro }) => {
      const label = `#${cobro.id}`;
      if (outcome === "not-stampable") {
        toast.error(
          cobro.rep_uuid
            ? `El cobro ${label} ya tenía REP (UUID ${cobro.rep_uuid}).`
            : isCobroRepPending(cobro)
              ? COBRO_REP_PENDING_MESSAGE
              : `El REP del cobro ${label} ya no puede timbrarse.`,
        );
        return;
      }
      toast.success(
        cobro.rep_uuid ? `REP del cobro ${label} timbrado. UUID ${cobro.rep_uuid}` : `REP del cobro ${label} timbrado`,
      );
    },
    errorMessage: stampCobroRepErrorMessage,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
    },
  });

  return { stamp, isStamping };
};
