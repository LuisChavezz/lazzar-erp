import { AxiosError } from "axios";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { createWorkOrderAvance, deleteWorkOrderAvance } from "../services/actions";
import type { WorkOrderAvanceConfig } from "../interfaces/work-order-avance.interface";

const errorMessage = (error: unknown, fallback: string) =>
  (error instanceof AxiosError && error.response?.status === 400
    ? firstDrfFieldMessage(error)
    : undefined) ?? fallback;

/**
 * Alta y baja de avances de una orden. Ambas re-consultan el detalle de la
 * orden (de donde salen `avances` y `resumen_avance`) y DEVUELVEN esa
 * invalidación, para que el botón siga ocupado hasta tener el saldo nuevo.
 */
export const useWorkOrderAvanceMutations = (
  config: WorkOrderAvanceConfig,
  orderId: number,
  detailQueryKey: QueryKey,
) => {
  const queryClient = useQueryClient();
  const refresh = () => {
    void invalidatePedidoProgress(queryClient);
    // El backend actualiza el estatus con el avance: refresca también el listado.
    void queryClient.invalidateQueries({ queryKey: config.listQueryKey });
    return queryClient.invalidateQueries({ queryKey: detailQueryKey });
  };

  const create = useMutation({
    mutationFn: (data: { cantidad: number; comentario?: string }) =>
      createWorkOrderAvance(config.endpoint, { [config.orderField]: orderId, ...data }),
    onSuccess: () => {
      toast.success("Avance registrado correctamente");
      return refresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "No se pudo registrar el avance. Intenta de nuevo.")),
  });

  const remove = useMutation({
    mutationFn: (avanceId: number) => deleteWorkOrderAvance(config.endpoint, avanceId),
    onSuccess: () => {
      toast.success("Avance eliminado correctamente");
      return refresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "No se pudo eliminar el avance. Intenta de nuevo.")),
  });

  return { create, remove };
};
