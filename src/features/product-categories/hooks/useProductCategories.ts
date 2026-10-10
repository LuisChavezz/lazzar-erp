import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getProductCategories } from "../services/actions";
import { ProductCategory } from "../interfaces/product-category.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useProductCategories = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<ProductCategory[]>(
    {
      queryKey: ["product-categories"],
      queryFn: getProductCategories,
    },
    { toastId: "product-categories-refetch-error" },
  );

  const categories = data ?? [];

  return {
    categories,
    isLoading,
    isInitialError,
    error,
  };
};
