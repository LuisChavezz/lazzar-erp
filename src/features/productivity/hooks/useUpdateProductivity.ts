import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProductivityRecord } from "../services/actions";
import { ProductivityUpdateVariables } from "../interfaces/productivity.interface";
import { PRODUCTIVITY_KEY } from "./useProductivity";
import {
  handleProductivityWriteError,
  SetProductivityFieldError,
} from "./productivityErrorMessages";

/**
 * No optimista, a propósito (como `useUpdateAbsence`): la escritura depende de
 * la guarda previa contra el servidor (`verifyProductivityEstado`).
 */
export const useUpdateProductivity = (setFieldError?: SetProductivityFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: ProductivityUpdateVariables) =>
      updateProductivityRecord(id, values),
    onSuccess: () => {
      toast.success("Registro de productividad actualizado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleProductivityWriteError(error, "Error al actualizar la productividad", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTIVITY_KEY }),
  });
};
