import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createCostCenter } from "../services/actions";
import { COST_CENTERS_KEY_ROOT } from "./useCostCenters";
import {
  setCostCenterFieldErrors,
  type SetCostCenterError,
} from "./setCostCenterFieldErrors";

/**
 * Alta de un centro de costo.
 *
 * `setError` recibe los errores de campo del 400 para que el formulario los
 * pinte bajo su input — sobre todo el de `codigo` duplicado (ver
 * `setCostCenterFieldErrors`). El toast queda como aviso general.
 *
 * Se invalida por la RAÍZ de la llave: alcanza a este catálogo y a los
 * selectores de centro de costo de la póliza, que cuelgan del mismo prefijo.
 */
export const useCreateCostCenter = (setError?: SetCostCenterError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCostCenter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COST_CENTERS_KEY_ROOT });
      toast.success("Centro de costo registrado correctamente");
    },
    onError: (error) => {
      setCostCenterFieldErrors(error, setError);
      toast.error("Error al registrar el centro de costo");
    },
  });
};
