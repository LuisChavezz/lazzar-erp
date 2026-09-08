import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteNotaCredito } from "../services/actions";
import { parseNotaCreditoError } from "./useCreateNotaCredito";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/**
 * Elimina FÍSICAMENTE una nota de crédito en borrador
 * (`DELETE /finanzas/notas-credito/{id}/`).
 *
 * No es baja lógica: el registro desaparece de la base de datos. El backend solo
 * lo permite sobre notas en `Borrador` —una `Emitida` responde 400 pidiendo
 * cancelarla primero—, que por definición nunca tocaron ninguna cuenta por
 * cobrar. La acción existe porque cancelar un borrador equivocado dejaría un
 * documento `Cancelada` sin ningún valor contable acumulándose en el listado
 * para siempre; el `estatus` del renglón es lo que gatea la acción en la UI, y
 * el diálogo de confirmación advierte que es permanente.
 *
 * Optimista de BORRADO (a diferencia de la cancelación, que marca la fila):
 * mismo patrón que cualquier `useDelete*` del proyecto — cancelar consultas en
 * vuelo, instantánea, quitar la fila, revertir en `onError`, invalidar en
 * `onSettled`.
 *
 * No invalida `["accounts-receivable"]`: un borrador nunca modificó ningún
 * saldo, así que borrarlo tampoco lo hace.
 *
 * El error se normaliza con `parseNotaCreditoError` —igual que en
 * `useEmitirNotaCredito`— y no con `extractErrorMessage`: el listado puede estar
 * rancio (otra pestaña, otro usuario) y el DELETE caer sobre una nota que ya se
 * emitió. Ese rechazo llega como lista de nivel superior,
 * `["No se puede eliminar una nota de crédito emitida. Cancelela primero."]`,
 * una forma de DRF que `extractErrorMessage` (que solo lee `{ error: string }`)
 * no desenvuelve, dejando al usuario con un "Request failed with status code
 * 400" en vez del motivo real y de qué hacer al respecto.
 */
export const useDeleteNotaCredito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteNotaCredito(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["credit-notes"] });
      const previousNotas = queryClient.getQueryData<NotaCredito[]>([
        "credit-notes",
      ]);

      if (previousNotas) {
        queryClient.setQueryData<NotaCredito[]>(["credit-notes"], (old) =>
          old ? old.filter((nota) => nota.id !== id) : [],
        );
      }

      return { previousNotas };
    },
    onError: (err, _id, context) => {
      if (context?.previousNotas) {
        queryClient.setQueryData(["credit-notes"], context.previousNotas);
      }
      console.error(err);
      // Solo `messages` — no se cae a `parsed.formError`: cuando el parser no
      // extrae ningún mensaje, ese campo trae un genérico redactado para el ALTA
      // ("Error al registrar la nota de crédito") o el propio texto de axios, y
      // ninguno de los dos describe un borrado.
      const parsed = parseNotaCreditoError(err);
      toast.error(
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : "Error al eliminar la nota de crédito",
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] }),
    onSuccess: () => {
      toast.success("Borrador eliminado correctamente");
    },
  });
};
