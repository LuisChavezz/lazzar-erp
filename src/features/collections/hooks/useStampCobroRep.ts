import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PrecheckError, toPrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";
import { getCobro, stampCobroRep } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import {
  COBRO_REP_PENDING_MESSAGE,
  isCobroRepPending,
  isCobroRepStampable,
  stampCobroRepErrorMessage,
} from "../utils/cobroRepStamping";

/** Candado del timbrado del REP, ÚNICO por cobro (ver `useStampCobroRep`). */
export const stampCobroRepMutationKey = (cobroId: number) => ["stamp-cobro-rep", cobroId] as const;

/**
 * Escribe el cobro VIGENTE en el listado en caché, reemplazando su fila por
 * `id`. Hoy la única entrada bajo `["cobros"]` es el listado (`Cobro[]`,
 * `useCobros`); cualquier otra forma se deja intacta. Así la fila deja de
 * ofrecer "Timbrar REP" en cuanto se conoce su estado, aunque el refetch de
 * `onSettled` tarde o falle.
 */
const writeCobroToList = (queryClient: QueryClient, cobro: Cobro) => {
  queryClient.setQueriesData({ queryKey: ["cobros"] }, (current: unknown) =>
    Array.isArray(current)
      ? (current as Cobro[]).map((row) => (row.id === cobro.id ? cobro : row))
      : current,
  );
};

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
 * acto fiscal irreversible. Mismo esquema que `useStampInvoice` (Facturación):
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
  const mutationKey = stampCobroRepMutationKey(cobroId);
  const { isRunning: isStamping, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<StampCobroRepResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      let current: Cobro;
      try {
        current = await getCobro(cobroId);
      } catch (error) {
        throw toPrecheckError(error, "No se pudo consultar el cobro.");
      }
      writeCobroToList(queryClient, current);
      if (!isCobroRepStampable(current)) return { outcome: "not-stampable", cobro: current };
      const cobro = await stampCobroRep(cobroId);
      writeCobroToList(queryClient, cobro);
      return { outcome: "stamped", cobro };
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
    onError: (error) => {
      toast.error(error instanceof PrecheckError ? error.message : stampCobroRepErrorMessage(error));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
    },
  });

  /**
   * Dispara el timbrado salvo que ya haya uno en vuelo para ESTE cobro.
   * `onSettled` corre al terminar, con cualquier resultado.
   */
  const stamp = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { stamp, isStamping };
};
