import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getContracts } from "../services/actions";
import { Contract } from "../interfaces/contract.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useContracts = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Contract[]>(
    {
      queryKey: ["contracts"],
      queryFn: getContracts,
    },
    { toastId: "contracts-refetch-error" },
  );

  const contracts = data ?? [];

  return {
    contracts,
    isLoading,
    isInitialError,
    error,
  };
};
