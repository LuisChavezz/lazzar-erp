import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  productVariantErrorToast,
  setProductVariantFieldErrors,
  type SetProductVariantError,
} from "../../product-variants/hooks/setProductVariantFieldErrors";
import { createProductVariantOnboarding } from "../services/actions";

/**
 * Alta rápida de variante (`POST /catalogo/producto-variante/onboarding/`).
 *
 * Reutiliza el normalizador de 400 del formulario de variantes (acepta el
 * mensaje como string o como lista por campo). Quien llama decide dónde pinta
 * cada campo; en particular `sku`, que aquí no tiene input propio.
 *
 * Se invalida la raíz `["product-variants"]` para refrescar todos los listados.
 */
export const useCreateProductVariantOnboarding = (setError?: SetProductVariantError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductVariantOnboarding,
    onSuccess: (variante) => {
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success(`Variante registrada con SKU ${variante.sku}`);
    },
    onError: (error) => {
      setProductVariantFieldErrors(error, setError);
      toast.error(productVariantErrorToast(error, "Error al registrar la variante"));
    },
  });
};
