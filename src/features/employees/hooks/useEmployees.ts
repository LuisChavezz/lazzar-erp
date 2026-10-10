import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getEmployees } from "../services/actions";
import { Employee } from "../interfaces/employee.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useEmployees = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Employee[]>(
    {
      queryKey: ["employees"],
      queryFn: getEmployees,
    },
    { toastId: "employees-refetch-error" },
  );

  const employees = data ?? [];

  return {
    employees,
    isLoading,
    isInitialError,
    error,
  };
};
