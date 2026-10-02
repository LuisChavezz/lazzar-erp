import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createProductivityRecord } from "../services/actions";
import { PRODUCTIVITY_KEY } from "./useProductivity";
import {
  handleProductivityWriteError,
  SetProductivityFieldError,
} from "./productivityErrorMessages";

/**
 * `empresa` y `departamento` NO salen del workspace: los deriva el formulario
 * del empleado elegido (ver `useProductivityForm`).
 */
export const useCreateProductivity = (setFieldError?: SetProductivityFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductivityRecord,
    onSuccess: () => {
      toast.success("Registro de productividad creado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleProductivityWriteError(error, "Error al registrar la productividad", setFieldError)
      );
    },
    // Se devuelve la promesa para que `mutateAsync` no resuelva hasta que el
    // refetch termine: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTIVITY_KEY }),
  });
};
