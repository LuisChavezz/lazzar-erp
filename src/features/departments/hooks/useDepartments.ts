import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getDepartments } from "../services/actions";
import { Department } from "../interfaces/department.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useDepartments = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Department[]>(
    {
      queryKey: ["departments"],
      queryFn: getDepartments,
    },
    { toastId: "departments-refetch-error" },
  );

  const departments = data ?? [];

  return {
    departments,
    isLoading,
    isInitialError,
    error,
  };
};
