import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { cancelarPago } from "../services/actions";
import { Pago } from "../interfaces/payment.interface";

/**
 * Cancela un pago (`POST /finanzas/pagos/{id}/cancelar/`).
 *
 * Combina las dos mitades que el proyecto ya tenía por separado: la forma
 * "llamar a un endpoint de acción y refrescar" de `useConfirmPurchaseOrder`, y
 * el optimismo de cambio de ESTATUS (no de borrado) de `useReactivateEmployee` —
 * cancelar → instantánea → marcar la fila → revertir en `onError` → invalidar en
 * `onSettled`.
 *
 * El registro NUNCA sale del listado: solo cambia su `estatus` a `Cancelado`,
 * por eso el optimista MARCA la fila en vez de filtrarla.
 *
 * `onSettled` invalida además `["cuentas-por-pagar"]` (la cancelación revierte
 * los saldos de las CxP aplicadas) y el detalle de movimientos de ESTE pago (su
 * movimiento bancario pasa a `Cancelado`), de modo que un diálogo abierto no se
 * quede mostrando el movimiento como vigente.
 */
export const useCancelPago = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelarPago(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["pagos"] });
      const previousPagos = queryClient.getQueryData<Pago[]>(["pagos"]);

      if (previousPagos) {
        queryClient.setQueryData<Pago[]>(["pagos"], (old) =>
          old
            ? old.map((pago) =>
                pago.id === id ? { ...pago, estatus: "Cancelado" as const } : pago,
              )
            : [],
        );
      }

      return { previousPagos };
    },
    onError: (err, _id, context) => {
      if (context?.previousPagos) {
        queryClient.setQueryData(["pagos"], context.previousPagos);
      }
      console.error(err);
      toast.error(extractErrorMessage(err, "Error al cancelar el pago"));
    },
    // Se devuelve una promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio y el
    // diálogo de confirmación (con `closeOnConfirm={false}`) puede cerrarse aquí.
    onSettled: (_data, _error, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pagos"] }),
        queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] }),
        queryClient.invalidateQueries({ queryKey: ["movimientos-por-pago", id] }),
      ]),
    onSuccess: () => {
      toast.success("Pago cancelado correctamente");
    },
  });
};
