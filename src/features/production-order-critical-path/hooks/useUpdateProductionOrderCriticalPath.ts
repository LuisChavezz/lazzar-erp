import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProductionOrderCriticalPath } from "../services/actions";
import type { CriticalPathUpdateBody } from "../interfaces/production-order-critical-path.interface";
import { productionOrderCriticalPathKey } from "./useProductionOrderCriticalPath";
import {
  handleCriticalPathWriteError,
  type SetCriticalPathFieldError,
} from "./criticalPathErrorMessages";

/** El diálogo lo usa (`useIsMutating`) para no cerrarse a media petición. */
export const updateCriticalPathMutationKey = ["production-order-critical-path-update"] as const;

export interface UpdateCriticalPathVariables {
  opId: number;
  body: CriticalPathUpdateBody;
}

/**
 * PATCH de la ruta crítica. No optimista: la respuesta trae los sellos de las
 * casillas de existencia, que solo calcula el servidor. Como GET y PATCH
 * comparten forma, la respuesta se escribe directo en la caché en vez de
 * volver a pedirla (un GET de más, además, crearía el registro si faltara).
 */
export const useUpdateProductionOrderCriticalPath = (setFieldError?: SetCriticalPathFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: updateCriticalPathMutationKey,
    mutationFn: ({ opId, body }: UpdateCriticalPathVariables) =>
      updateProductionOrderCriticalPath(opId, body),
    onSuccess: (data, { opId }) => {
      queryClient.setQueryData(productionOrderCriticalPathKey(opId), data);
      toast.success("Ruta crítica actualizada");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleCriticalPathWriteError(error, "No se pudo guardar la ruta crítica.", setFieldError)
      );
    },
  });
};
