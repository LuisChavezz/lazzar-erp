import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSize } from "../services/actions";
import { SizeFormValues } from "../schemas/size.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

type SetSizeError = (
  field: keyof SizeFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreateSize = (setError?: SetSizeError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      toast.success("Talla registrada correctamente");
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
      toast.error("Error al registrar la talla");
    },
  });
};
