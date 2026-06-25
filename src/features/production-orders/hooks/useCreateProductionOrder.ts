import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { createProductionOrderOnboarding } from "@/src/features/production-orders/services/actions";
import type { CreateProductionOrderBody } from "@/src/features/production-orders/interfaces/production-order.interface";

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
      toast.success("Orden de producción creada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;
        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;
          const firstMessage = Object.values(validationErrors).flat()[0];
          if (firstMessage) {
            toast.error(firstMessage);
            return;
          }
        }
      }
      toast.error("Error al crear la orden de producción");
    },
  });
};
