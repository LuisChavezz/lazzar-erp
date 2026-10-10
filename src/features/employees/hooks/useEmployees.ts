import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getEmployees } from "../services/actions";
import { Employee } from "../interfaces/employee.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useEmployees = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const employees = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "employees-refetch-error",
  });

  return {
    employees,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
