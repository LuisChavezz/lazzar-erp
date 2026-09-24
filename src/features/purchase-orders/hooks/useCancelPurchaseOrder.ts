import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelPurchaseOrder } from "../services/actions";

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
 * Invalida lo mismo que `useConfirmPurchaseOrder`: `["purchase-orders"]` (por
 * prefijo también el detalle `["purchase-orders", id]`) y el onboarding de
 * OC. La orden cancelada NO desaparece: vuelve en el listado con estatus 6.
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
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      toast.success("Orden de compra cancelada correctamente");
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
