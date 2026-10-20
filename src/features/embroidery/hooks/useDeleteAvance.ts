import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { deleteAvance } from "../services/actions";
import { embroideryOrderDetailQueryKey } from "./useEmbroideryOrderDetail";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Mutación de baja de un avance de bordado
 * (`DELETE /produccion/bordado-avances/{id}/`). El id de la OB padre se fija al
 * crear el hook —la respuesta del DELETE no lo trae—; `mutate` recibe el id del
 * avance a eliminar.
 *
 * Invalida `["embroidery-order-detail", obId]` y DEVUELVE la invalidación, por
 * el mismo motivo que `useCreateAvance`: la mutación sigue en `isPending` hasta
 * que el detalle (y con él el tope del diálogo de alta) se re-consulta.
 */
export const useDeleteAvance = (obId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avanceId: number) => deleteAvance(avanceId),
    onSuccess: () => {
      toast.success("Avance eliminado correctamente");
      // Se espera solo el detalle de la OB: su `resumen_avance` es el tope del
      // diálogo. El pedido, sin esperar (ver `invalidatePedidoProgress`).
      void invalidatePedidoProgress(queryClient);
      return queryClient.invalidateQueries({
        queryKey: embroideryOrderDetailQueryKey(obId),
      });
    },
    onError: (error) => {
      // Solo un 400 trae un motivo que mostrar; un 5xx o un fallo de red cae
      // al texto en español (ver `useToggleCostCenterActivo`).
      const drfMessage =
        error instanceof AxiosError && error.response?.status === 400
          ? firstDrfFieldMessage(error)
          : undefined;
      toast.error(drfMessage ?? "No se pudo eliminar el avance. Intenta de nuevo.");
    },
  });
};
