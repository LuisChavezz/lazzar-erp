import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateColor } from "../services/actions";
import { ColorFormValues } from "../schemas/color.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface UpdateColorPayload extends ColorFormValues {
  id: number;
}

type SetColorError = (
  field: keyof ColorFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateColor = (setError?: SetColorError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateColorPayload) => updateColor(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
      toast.success("Color actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ColorFormValues;
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
      toast.error("Error al actualizar el color");
    },
  });
};
