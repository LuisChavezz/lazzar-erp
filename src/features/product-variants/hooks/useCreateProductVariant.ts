import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductVariant } from "../services/actions";
import { ProductVariantCreate } from "../interfaces/product-variant.interface";
import toast from "react-hot-toast";
import {
  productVariantErrorToast,
  setProductVariantFieldErrors,
  type SetProductVariantError,
} from "./setProductVariantFieldErrors";

export const useCreateProductVariant = (
  setError?: SetProductVariantError
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductVariantCreate) => createProductVariant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success("Variante registrada correctamente");
    },
    onError: (error) => {
      setProductVariantFieldErrors(error, setError);
      toast.error(productVariantErrorToast(error, "Error al registrar la variante"));
    },
  });
};
