import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toastDrfError } from "@/src/utils/toastDrfError";
import toast from "react-hot-toast";
import { createProductionOrderOnboarding } from "@/src/features/production-orders/services/actions";
import type { CreateProductionOrderBody } from "@/src/features/production-orders/interfaces/production-order.interface";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * useCreateProductionOrder
 *
 * Mutación para crear una orden de producción vía
 * `POST /produccion/orden-produccion/onboarding/`. Sigue la convención del
 * proyecto (ver `useCreateListaMaterial`): la lógica de mutación —invalidación
 * de la lista, toast de éxito y extracción del primer error de validación 400—
 * vive en su propio hook, separada del hook de formulario.
 */
export const useCreateProductionOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductionOrderBody) =>
      createProductionOrderOnboarding(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      void invalidatePedidoProgress(queryClient);
      toast.success("Orden de producción creada correctamente");
    },
    onError: (error) => toastDrfError(error, "Error al crear la orden de producción"),
  });
};
