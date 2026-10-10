import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
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
