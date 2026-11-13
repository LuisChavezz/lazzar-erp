import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getProductVariants } from "../services/actions";
import { ProductVariant } from "../interfaces/product-variant.interface";

/**
 * Listado COMPLETO de variantes, para las tablas de catálogo. Los selectores
 * usan el selector ligero (`useProductVariantSelector`).
 *
 * Su llave es la raíz `["product-variants"]`, que invalidan las mutaciones de
 * variantes y de BOM; las búsquedas del selector cuelgan de ella
 * (`["product-variants", "selector", params]`).
 *
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useProductVariants = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<ProductVariant[]>(
    {
      queryKey: ["product-variants"],
      queryFn: () => getProductVariants(),
    },
    { toastId: "product-variants-refetch-error" },
  );

  const productVariants = data ?? [];

  return {
    productVariants,
    isLoading,
    isInitialError,
    error,
  };
};
