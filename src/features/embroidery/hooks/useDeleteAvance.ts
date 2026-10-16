import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { deleteAvance } from "../services/actions";
import { embroideryOrderDetailQueryKey } from "./useEmbroideryOrderDetail";

/**
 * Mutación de baja de un avance de bordado
 * (`DELETE /produccion/bordado-avances/{id}/`). El id de la OB padre y el de su
 * pedido se fijan al crear el hook —la respuesta del DELETE no los trae—;
 * `mutate` recibe el id del avance a eliminar.
 *
 * Invalida las mismas llaves que `useCreateAvance`, y por el mismo motivo: el
 * detalle de la OB (`avances`/`resumen_avance`) y la trazabilidad del pedido,
 * que suma los avances activos. El listado no lee avances.
 */
export const useDeleteAvance = (obId: number, pedidoId: number | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avanceId: number) => deleteAvance(avanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: embroideryOrderDetailQueryKey(obId),
      });
      if (pedidoId !== null) {
        queryClient.invalidateQueries({
          queryKey: pedidoTrazabilidadQueryKey(pedidoId),
        });
      }
      toast.success("Avance eliminado correctamente");
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
