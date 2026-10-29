import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";
import { createPicking } from "../services/actions";
import { invalidateIfPedidoRejected } from "./usePickingOnboarding";
import { parsePickingError, type ParsedPickingError } from "../utils/parsePickingError";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Mutación para crear un picking parcial. `onServerError` recibe el error ya
 * normalizado para que el Paso 2 lo reparta entre el banner, los campos y —si
 * `staleData`— dispare la recarga del onboarding.
 *
 * Para los errores de dato desactualizado se usa un toast NEUTRO (no de error):
 * no es un fallo del usuario, solo cambiaron los pendientes. El resto sí sale
 * como `toast.error`. Invalida `["pickings"]` (la lista del módulo).
 */
export const useCreatePicking = (onServerError?: (parsed: ParsedPickingError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPicking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickings"] });
      void invalidatePedidoProgress(queryClient);
      // Crear el picking también genera una transferencia COMPLETADA del almacén
      // origen al destino (`picking_service.py`): mueve existencias y deja un
      // traspaso y un movimiento: los traspasos, igual que
      // `useCreateStockTransfer`, y toda vista de existencias.
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      void invalidateStockQueries(queryClient);
      toast.success("Surtido registrado correctamente");
    },
    onError: (error) => {
      const parsed = parsePickingError(error);
      invalidateIfPedidoRejected(queryClient, error);
      onServerError?.(parsed);

      if (parsed.staleData) {
        toast("Las cantidades disponibles cambiaron; se actualizaron los datos. Revisa y reintenta.", {
          icon: "🔄",
        });
        return;
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el surtido";
      toast.error(toastMessage);
    },
  });
};
