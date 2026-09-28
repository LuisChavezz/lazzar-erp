import type { Mutation } from "@tanstack/react-query";

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
