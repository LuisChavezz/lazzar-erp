import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePurchaseOrder } from "../services/actions";
import type { UpdatePurchaseOrderParams } from "../interfaces/purchase-order.interface";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

/**
 * Claves del 400 con las que el backend (`update` de `OrdenCompraViewSet`)
 * rechaza la edición porque la orden YA NO puede modificarse: `estatus`
 * (cancelada, o parcial/totalmente recibida), `recepciones` y
 * `facturas_proveedores`. Reintentar no sirve: la orden cambió en otro lado.
 */
const BUSINESS_REJECTION_KEYS = ["estatus", "recepciones", "facturas_proveedores"] as const;

interface UseUpdatePurchaseOrderOptions {
  /**
   * Se llama (además del toast con el mensaje del backend) cuando el PUT se
   * rechaza con una de {@link BUSINESS_REJECTION_KEYS}, para que el llamador
   * cierre el flujo de edición. Cualquier otro error deja todo como está.
   * Mismo patrón de opción que `useCancelPurchaseOrder({ onReasonError })`.
   */
  onBusinessRejection?: () => void;
}

export const useUpdatePurchaseOrder = ({
  onBusinessRejection,
}: UseUpdatePurchaseOrderOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pk, body }: UpdatePurchaseOrderParams) =>
      updatePurchaseOrder({ pk, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      // El PUT recrea los renglones (ids nuevos) y regresa la orden a
      // pendiente: el selector de OC del alta de recepción no debe seguir
      // ofreciéndola desde su caché con los ids viejos.
      queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
      toast.success("Orden de compra actualizada correctamente");
    },
    // Con éxito o con error: un rechazo significa que la fila en caché está
    // vieja (p. ej. se canceló en otra pestaña) y sin refetch seguiría
    // ofreciendo Editar.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const isBusinessRejection = BUSINESS_REJECTION_KEYS.some((key) =>
            drfFieldMessage(error, key),
          );
          const validationErrors = data as Record<string, string[]>;
          const firstMessage = Object.values(validationErrors).flat()[0];
          if (firstMessage) {
            toast.error(firstMessage);
            if (isBusinessRejection) onBusinessRejection?.();
            return;
          }
        }
      }
      toast.error("Error al actualizar la orden de compra");
    },
  });
};
