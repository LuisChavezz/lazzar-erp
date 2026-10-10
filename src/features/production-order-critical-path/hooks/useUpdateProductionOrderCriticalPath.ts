import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProductionOrderCriticalPath } from "../services/actions";
import type { CriticalPathUpdateBody } from "../interfaces/production-order-critical-path.interface";
import { productionOrderCriticalPathKey } from "./useProductionOrderCriticalPath";
import {
  handleCriticalPathWriteError,
  isCriticalPathConflictError,
  type SetCriticalPathFieldError,
} from "./criticalPathErrorMessages";

/** El diálogo lo usa (`useIsMutating`) para no cerrarse a media petición. */
export const updateCriticalPathMutationKey = ["production-order-critical-path-update"] as const;

export interface UpdateCriticalPathVariables {
  opId: number;
  body: CriticalPathUpdateBody;
}

/**
 * PATCH de la ruta crítica. No optimista: la respuesta trae los sellos que
 * solo calcula el servidor (los de las casillas de existencia y
 * `fecha_kit_completo`). Como GET y PATCH
 * comparten forma, la respuesta se escribe directo en la caché en vez de
 * volver a pedirla.
 *
 * Un 409 significa que la OP ya está Completada o Cancelada y que el estatus
 * con que se abrió el diálogo era viejo: se invalidan el listado y el detalle
 * de la OP (llaves de `useProductionOrders` / `useProductionOrderOnboarding`)
 * para que la próxima apertura, desde cualquiera de los dos, ya sea de solo
 * lectura.
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
    onError: (error, { opId }) => {
      console.error(error);
      if (isCriticalPathConflictError(error)) {
        void queryClient.invalidateQueries({ queryKey: ["production-orders"] });
        void queryClient.invalidateQueries({ queryKey: ["production-order-onboarding", opId] });
      }
      toast.error(
        handleCriticalPathWriteError(error, "No se pudo guardar la ruta crítica.", setFieldError)
      );
    },
  });
};
