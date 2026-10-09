import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelPurchaseOrder } from "../services/actions";
import { invalidateReceiptOrderOptions } from "../utils/invalidateReceiptOrderOptions";

interface UseCancelPurchaseOrderOptions {
  /**
   * Si se pasa, un error del backend sobre `motivo_cancelacion` (p. ej.
   * `{ "motivo_cancelacion": "El motivo de cancelación es requerido." }`) se
   * entrega aquí EN VEZ de notificarse con toast, para que el formulario lo
   * pinte bajo su campo. Sin esta opción, todo error sale en toast.
   * Mismo patrón que `setError` en `useCreateSupplier`.
   */
  onReasonError?: (message: string) => void;
}

/**
 * Cancela una orden de compra (`POST /compras/ordenes/{id}/cancelar/`).
 *
 * Invalida `["purchase-orders"]` (por prefijo también el detalle
 * `["purchase-orders", id]`) al TERMINAR, con éxito o con error: un 400 como
 * `{ "estatus": "La orden ya no puede cancelarse." }` significa que la fila en
 * caché está vieja (p. ej. se canceló en otra pestaña), y sin refetch seguiría
 * ofreciendo acciones que el backend ya rechaza. El onboarding de OC solo
 * cambia si la cancelación ocurrió. La orden cancelada NO desaparece: vuelve
 * en el listado con estatus 6.
 *
 * Errores: salen en toast con el mensaje del backend (`firstDrfFieldMessage`,
 * con `extractErrorMessage` de respaldo), salvo el de `motivo_cancelacion`
 * cuando el llamador pasa `onReasonError`.
 */
export const useCancelPurchaseOrder = ({ onReasonError }: UseCancelPurchaseOrderOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      // Una autorizada cancelada deja de ser recibible.
      invalidateReceiptOrderOptions(queryClient);
      toast.success("Orden de compra cancelada correctamente");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (error) => {
      const reasonMessage = drfFieldMessage(error, "motivo_cancelacion");
      if (reasonMessage && onReasonError) {
        onReasonError(reasonMessage);
        return;
      }
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "Error al cancelar la orden de compra"),
      );
    },
  });
};
