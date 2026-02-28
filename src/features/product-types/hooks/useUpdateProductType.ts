import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductType } from "../services/actions";
import { ProductTypeCreate } from "../interfaces/product-type.interface";
import { ProductTypeFormValues } from "../schemas/product-type.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";

interface UpdateProductTypePayload extends ProductTypeCreate {
  id: number;
}

export const useUpdateProductType = (setError?: UseFormSetError<ProductTypeFormValues>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateProductTypePayload) => updateProductType(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      toast.success("Tipo de producto actualizado correctamente");
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
      toast.error("Error al actualizar el tipo de producto");
    },
  });
};
