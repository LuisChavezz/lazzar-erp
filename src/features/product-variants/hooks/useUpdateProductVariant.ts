import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductVariant } from "../services/actions";
import { ProductVariantCreate } from "../interfaces/product-variant.interface";
import toast from "react-hot-toast";
import {
  productVariantErrorToast,
  setProductVariantFieldErrors,
  type SetProductVariantError,
} from "./setProductVariantFieldErrors";

interface UpdateProductVariantPayload extends ProductVariantCreate {
  id: number;
}

export const useUpdateProductVariant = (
  setError?: SetProductVariantError
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateProductVariantPayload) =>
      updateProductVariant(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success("Variante actualizada correctamente");
    },
    onError: (error) => {
      setProductVariantFieldErrors(error, setError);
      toast.error(productVariantErrorToast(error, "Error al actualizar la variante"));
    },
  });
};
