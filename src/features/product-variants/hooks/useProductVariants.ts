import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getProductVariants } from "../services/actions";
import { ProductVariant } from "../interfaces/product-variant.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`. El `toastId` es uno solo para las dos llaves
 * (`con_bom` o no), así que una invalidación de la raíz `["product-variants"]`
 * que falle en ambas da un único toast.
 */
export const useProductVariants = (con_bom?: boolean) => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<ProductVariant[]>(
    {
      queryKey: ["product-variants", con_bom],
      queryFn: () => getProductVariants(con_bom),
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
