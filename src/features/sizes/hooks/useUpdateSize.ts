import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSize } from "../services/actions";
import { SizeFormValues } from "../schemas/size.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

interface UpdateSizePayload extends SizeFormValues {
  id: number;
}

type SetSizeError = (
  field: keyof SizeFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateSize = (setError?: SetSizeError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateSizePayload) => updateSize(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      toast.success("Talla actualizada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof SizeFormValues;
            const errorMessage = firstNestedFieldMessage(validationErrors[key]);

            if (errorMessage) {
              setError(fieldKey, {
                type: "server",
                message: errorMessage,
              });
            }
          });
        }
      }
      toast.error("Error al actualizar la talla");
    },
  });
};
