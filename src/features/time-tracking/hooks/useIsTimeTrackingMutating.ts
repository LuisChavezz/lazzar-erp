import { useIsMutating } from "@tanstack/react-query";
import { createTimeSegmentMutationKey } from "./useCreateTimeSegment";
import { updateTimeSegmentMutationKey } from "./useUpdateTimeSegment";
import { deleteTimeSegmentMutationKey } from "./useDeleteTimeSegment";

/** Primer segmento de la clave de cada mutación del módulo. */
const MUTATION_KEYS = new Set<unknown>([
  createTimeSegmentMutationKey[0],
  updateTimeSegmentMutationKey[0],
  deleteTimeSegmentMutationKey[0],
]);

/**
 * ¿Hay alguna escritura de tramos en vuelo? Mientras la hay, el desglose
 * bloquea las demás acciones: cada una se valida contra el listado, que
 * todavía no refleja la que está en curso.
 */
export const useIsTimeTrackingMutating = (): boolean =>
  useIsMutating({
    predicate: (mutation) => MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
  }) > 0;
