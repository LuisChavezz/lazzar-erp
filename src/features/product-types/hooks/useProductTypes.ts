import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getProductTypes } from "../services/actions";
import { ProductType } from "../interfaces/product-type.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useProductTypes = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<ProductType[]>(
    {
      queryKey: ["product-types"],
      queryFn: getProductTypes,
    },
    { toastId: "product-types-refetch-error" },
  );

  const productTypes = data ?? [];

  return {
    productTypes,
    isLoading,
    isInitialError,
    error,
  };
};
