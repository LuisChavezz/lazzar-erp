import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductCategory } from "../services/actions";
import { ProductCategoryFormValues } from "../schemas/product-category.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface UpdateProductCategoryPayload extends ProductCategoryFormValues {
  id: number;
  empresa: number;
}

type SetProductCategoryError = (
  field: keyof ProductCategoryFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateProductCategory = (
  setError?: SetProductCategoryError
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, descripcion, ...values }: UpdateProductCategoryPayload) =>
      updateProductCategory(id, { ...values, descripcion: descripcion ?? "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoría actualizada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ProductCategoryFormValues;
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
      toast.error("Error al actualizar la categoría");
    },
  });
};
