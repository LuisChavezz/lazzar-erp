import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { updatePosition } from "../services/actions";
import { PositionPayload } from "../interfaces/position.interface";
import { PositionFormValues } from "../schemas/position.schema";

// En edición la empresa viaja tal cual la trae el registro: el PUT la exige y
// no debe reasignarse por el workspace activo del usuario.
interface UpdatePositionPayload extends PositionPayload {
  id: number;
}

type SetPositionError = (
  field: keyof PositionFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdatePosition = (setError?: SetPositionError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdatePositionPayload) => updatePosition(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Puesto actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof PositionFormValues;
            const errorMessages = validationErrors[key];

            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0],
              });
            }
          });
        }
      }
      toast.error("Error al actualizar el puesto");
    },
  });
};
