import type { Mutation, QueryClient } from "@tanstack/react-query";

/**
 * Id del registro de una mutación de FILA, para `useMutationState({ select })`:
 * las variables son el id mismo (eliminar) o un objeto con `id` (aprobar,
 * rechazar). Lo comparten los "en vuelo" por fila de vacaciones y de permisos
 * y ausencias.
 */
export const selectMutationRecordId = (
  mutation: Mutation<unknown, Error, unknown, unknown>
): number => {
  const variables = mutation.state.variables;
  return typeof variables === "number" ? variables : (variables as { id: number }).id;
};

/**
 * ¿Tiene el registro `id` alguna mutación EN CURSO bajo alguna de
 * `mutationKeys`? Lectura síncrona de la `MutationCache` (la mutación queda
 * `pending` en el mismo tick en que se dispara), así que sirve de candado
 * contra el doble disparo sin un `useRef` aparte. Las variables de esas
 * mutaciones son el id o un objeto con `id` (`selectMutationRecordId`).
 */
export const isRecordMutating = (
  queryClient: QueryClient,
  mutationKeys: readonly (readonly unknown[])[],
  id: number,
): boolean =>
  mutationKeys.some(
    (mutationKey) =>
      queryClient.isMutating({
        mutationKey: [...mutationKey],
        predicate: (mutation) => selectMutationRecordId(mutation) === id,
      }) > 0,
  );
