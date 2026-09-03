import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { updateShift } from "../services/actions";
import { ShiftPayload } from "../interfaces/shift.interface";
import { ShiftFormValues } from "../schemas/shift.schema";

// En edición la empresa viaja tal cual la trae el registro: no debe
// reasignarse por el workspace activo del usuario.
interface UpdateShiftPayload extends ShiftPayload {
  id: number;
}

type SetShiftError = (
  field: keyof ShiftFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateShift = (setError?: SetShiftError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateShiftPayload) => updateShift(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Turno actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ShiftFormValues;
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
      toast.error("Error al actualizar el turno");
    },
  });
};
