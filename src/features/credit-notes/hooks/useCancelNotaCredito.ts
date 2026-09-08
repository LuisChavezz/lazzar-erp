import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { cancelarNotaCredito } from "../services/actions";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/**
 * Cancela una nota de crédito
 * (`POST /finanzas/notas-credito/{id}/cancelar/`).
 *
 * Mismo molde que `useCancelPago`: optimismo de cambio de ESTATUS (no de
 * borrado) — cancelar → instantánea → marcar la fila → revertir en `onError` →
 * invalidar en `onSettled`. Aquí el optimismo sí es adecuado (a diferencia de
 * `useEmitirNotaCredito`): la acción es idempotente y no tiene precondiciones de
 * negocio que el backend pueda rechazar.
 *
 * El registro NUNCA sale del listado: solo cambia su `estatus` a `Cancelada`,
 * por eso el optimista MARCA la fila en vez de filtrarla.
 *
 * `onSettled` invalida además `["accounts-receivable"]`: cancelar una nota
 * EMITIDA devuelve el importe acreditado al saldo de la cuenta por cobrar y
 * reajusta su estatus, así que las listas de CxC cacheadas quedan obsoletas.
 */
export const useCancelNotaCredito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelarNotaCredito(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["credit-notes"] });
      const previousNotas = queryClient.getQueryData<NotaCredito[]>([
        "credit-notes",
      ]);

      if (previousNotas) {
        queryClient.setQueryData<NotaCredito[]>(["credit-notes"], (old) =>
          old
            ? old.map((nota) =>
                nota.id === id
                  ? { ...nota, estatus: "Cancelada" as const }
                  : nota,
              )
            : [],
        );
      }

      return { previousNotas };
    },
    onError: (err, _id, context) => {
      if (context?.previousNotas) {
        queryClient.setQueryData(["credit-notes"], context.previousNotas);
      }
      console.error(err);
      toast.error(extractErrorMessage(err, "Error al cancelar la nota de crédito"));
    },
    // Se devuelve una promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio y el
    // diálogo de confirmación (con `closeOnConfirm={false}`) puede cerrarse aquí.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-notes"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] }),
      ]),
    onSuccess: () => {
      toast.success("Nota de crédito cancelada correctamente");
    },
  });
};
