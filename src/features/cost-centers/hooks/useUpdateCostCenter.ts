import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateCostCenter } from "../services/actions";
import type { CostCenterCreate } from "../interfaces/cost-center.interface";
import { COST_CENTERS_KEY_ROOT } from "./useCostCenters";
import {
  setCostCenterFieldErrors,
  type SetCostCenterError,
} from "./setCostCenterFieldErrors";

interface UpdateCostCenterPayload extends CostCenterCreate {
  id: number;
}

/**
 * Edición de un centro de costo (PATCH).
 *
 * El payload no lleva `activo`, así que CONSERVA su valor (ver
 * `updateCostCenter`): editar un centro dado de baja no lo reactiva. El 400 de
 * `codigo` duplicado también aplica al editar: se reparte igual que en el alta.
 */
export const useUpdateCostCenter = (setError?: SetCostCenterError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateCostCenterPayload) =>
      updateCostCenter(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COST_CENTERS_KEY_ROOT });
      toast.success("Centro de costo actualizado correctamente");
    },
    onError: (error) => {
      setCostCenterFieldErrors(error, setError);
      toast.error("Error al actualizar el centro de costo");
    },
  });
};
