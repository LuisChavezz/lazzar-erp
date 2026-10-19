import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createColor } from "../services/actions";
import toast from "react-hot-toast";
import { handleColorWriteError, type SetColorFieldError } from "./colorErrorMessages";

export const useCreateColor = (setFieldError?: SetColorFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      toast.success("Color registrado correctamente");
    },
    onError: (error) => {
      toast.error(handleColorWriteError(error, "Error al registrar el color", setFieldError));
    },
  });
};
