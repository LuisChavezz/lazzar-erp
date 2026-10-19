import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateColor } from "../services/actions";
import type { ColorCreate } from "../interfaces/color.interface";
import toast from "react-hot-toast";
import { handleColorWriteError, type SetColorFieldError } from "./colorErrorMessages";

interface UpdateColorPayload extends ColorCreate {
  id: number;
}

export const useUpdateColor = (setFieldError?: SetColorFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateColorPayload) => updateColor(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      toast.success("Color actualizado correctamente");
    },
    onError: (error) => {
      toast.error(handleColorWriteError(error, "Error al actualizar el color", setFieldError));
    },
  });
};
