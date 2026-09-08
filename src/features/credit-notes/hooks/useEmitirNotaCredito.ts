import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { emitirNotaCredito } from "../services/actions";
import { parseNotaCreditoError } from "./useCreateNotaCredito";

/**
 * Emite una nota que estaba en borrador
 * (`PATCH /finanzas/notas-credito/{id}/` con `{ estatus: "Emitida" }`).
 *
 * SIN actualización optimista, a diferencia de `useCancelNotaCredito` y del
 * precedente `useCancelPago`. La emisión es la operación que MUEVE dinero y el
 * backend la rechaza por condiciones de negocio reales y frecuentes: que la
 * factura no tenga cuenta por cobrar, o que el total supere el saldo disponible.
 * Pintar la fila como `Emitida` para devolverla a `Borrador` medio segundo
 * después diría que un documento contable se emitió cuando no fue así. Se espera
 * al servidor y se invalida; la cancelación sí puede ser optimista porque es
 * idempotente y no tiene precondiciones que puedan fallar.
 *
 * El error se normaliza con `parseNotaCreditoError` —el mismo parser del alta—
 * en vez de `extractErrorMessage`: el 400 del techo llega como
 * `{"total": ["El total de la nota (X) no puede superar el saldo..."]}`, una
 * forma de DRF que `extractErrorMessage` (que solo lee `{ error: string }`) no
 * sabe desenvolver, dejando al usuario con un "Request failed with status code
 * 400" en vez del motivo real.
 *
 * `onSettled` invalida también `["accounts-receivable"]`: emitir baja el saldo
 * de la cuenta por cobrar de la factura y puede marcarla `Pagada`.
 */
export const useEmitirNotaCredito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => emitirNotaCredito(id),
    onSuccess: () => {
      toast.success("Nota de crédito emitida correctamente");
    },
    onError: (error) => {
      const parsed = parseNotaCreditoError(error);
      const message =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al emitir la nota de crédito";
      console.error(error);
      toast.error(message);
    },
    // Se devuelve una promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio y el
    // diálogo de confirmación (con `closeOnConfirm={false}`) puede cerrarse aquí.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-notes"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] }),
      ]),
  });
};
