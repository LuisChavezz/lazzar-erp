import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductType } from "../services/actions";
import { ProductTypeFormValues } from "../schemas/product-type.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";

export const useCreateProductType = (setError?: UseFormSetError<ProductTypeFormValues>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      toast.success("Tipo de producto registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ProductTypeFormValues;
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
      toast.error("Error al registrar el tipo de producto");
    },
  });
};
