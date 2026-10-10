import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getCustomers } from "../services/actions";
import { Customer } from "../interfaces/customer.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useCustomers = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Customer[]>(
    {
      queryKey: ["customers"],
      queryFn: getCustomers,
    },
    { toastId: "customers-refetch-error" },
  );

  const customers = data ?? [];

  return {
    customers,
    isLoading,
    isInitialError,
    error,
  };
};
