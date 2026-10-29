"use client";

import { useMutationState, type MutationKey } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";

/**
 * Ids de registro con una mutación de fila EN CURSO bajo alguna de
 * `mutationKeys` (se compara su primer segmento), leídos de la
 * `MutationCache` y no de cada `useMutation`, que solo recuerda su ÚLTIMA
 * llamada. Pensado para UNA sola suscripción por listado, que llega a cada
 * menú por su contexto de acciones (`createRowActionsContext`).
 */
export function usePendingRecordIds(...mutationKeys: MutationKey[]): number[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) =>
        mutationKeys.some((key) => key[0] === mutation.options.mutationKey?.[0]),
    },
    select: selectMutationRecordId,
  });
}
