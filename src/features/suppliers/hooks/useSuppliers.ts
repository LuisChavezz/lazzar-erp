import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getSuppliers } from "../services/actions";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useSuppliers = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery(
    {
      queryKey: ["suppliers"],
      queryFn: getSuppliers,
      gcTime: LIST_QUERY_GC_TIME,
    },
    { toastId: "suppliers-refetch-error" },
  );

  const suppliers = data ?? [];

  return {
    suppliers,
    isLoading,
    isInitialError,
    error,
  };
};
