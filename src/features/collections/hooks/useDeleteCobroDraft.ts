import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { deleteCobro } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import { cobroLabel } from "../utils/collection.utils";
import { isActionOutcomeUnknown } from "../utils/actionOutcome";
import { COBRO_DRAFT_NOT_DRAFT_MESSAGE } from "../utils/cobroDraft";
import { useCobroAction } from "./useCobroAction";

/** Candado de "Eliminar", ÚNICO por cobro. */
export const deleteCobroDraftMutationKey = (cobroId: number) => ["delete-cobro-draft", cobroId] as const;

export const COBRO_DELETE_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el borrador pudo haberse eliminado. Actualiza los datos antes de volver a intentarlo.";

/** Mensaje de un fallo del DELETE (403 `detail`, 404, 500) con el texto del backend. */
const deleteCobroDraftErrorMessage = (error: unknown): string =>
  (isActionOutcomeUnknown(error) ? COBRO_DELETE_UNCONFIRMED_MESSAGE : undefined) ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo eliminar el borrador.");

/**
 * Elimina UN borrador sin folio (`DELETE /finanzas/cobros/{id}/`), sobre el
 * esqueleto `useCobroAction` (candado por cobro, retrieve FRESCO antes):
 *
 * - Con el cobro fresco, si ya no es `Borrador` o ya tiene folio, NO hace el
 *   DELETE: con folio se cancela, para no dejar un hueco en la serie. El
 *   backend ya no asigna folio a un borrador (lo hace al aplicar); la guarda
 *   queda por defensa, para borradores anteriores a ese cambio.
 * - Al terminar bien quita la fila del listado en caché (el detalle se cierra
 *   solo al desaparecer su fila) y relee el listado. Un borrador no movió
 *   saldos, banco ni póliza: no hay nada más que refrescar.
 */
export const useDeleteCobroDraft = (cobroId: number) => {
  const queryClient = useQueryClient();

  const { trigger: remove, isRunning: isDeleting } = useCobroAction({
    mutationKey: deleteCobroDraftMutationKey(cobroId),
    cobroId,
    run: async (current) => {
      if (current.estatus !== "Borrador") throw new PrecheckError(COBRO_DRAFT_NOT_DRAFT_MESSAGE);
      if (current.folio) {
        throw new PrecheckError(
          `El borrador ya tiene el folio ${current.folio}: cancélalo en lugar de eliminarlo para no dejar un hueco en la serie.`,
        );
      }
      await deleteCobro(cobroId);
      return { cobro: current };
    },
    onSuccess: ({ cobro }) => {
      queryClient.setQueriesData({ queryKey: ["cobros"] }, (rows: unknown) =>
        Array.isArray(rows) ? (rows as Cobro[]).filter((row) => row.id !== cobro.id) : rows,
      );
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
      toast.success(`Borrador ${cobroLabel(cobro)} eliminado`);
    },
    errorMessage: deleteCobroDraftErrorMessage,
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
    },
  });

  return { remove, isDeleting };
};
