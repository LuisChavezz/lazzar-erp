import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductCategory } from "../services/actions";
import { ProductCategoryFormValues } from "../schemas/product-category.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

type SetProductCategoryError = (
  field: keyof ProductCategoryFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreateProductCategory = (
  setError?: SetProductCategoryError
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoría registrada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ProductCategoryFormValues;
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
      toast.error("Error al registrar la categoría");
    },
  });
};
