import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductVariant } from "../services/actions";
import { ProductVariantCreate } from "../interfaces/product-variant.interface";
import { ProductVariantFormValues } from "../schemas/product-variant.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";

export const useCreateProductVariant = (
  setError?: UseFormSetError<ProductVariantFormValues>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductVariantCreate) => createProductVariant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success("Variante registrada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ProductVariantFormValues;
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
      toast.error("Error al registrar la variante");
    },
  });
};
