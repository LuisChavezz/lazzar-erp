import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSatProdservCodes } from "../services/actions";
import { SatProdservCode } from "../interfaces/sat-prodserv-code.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useSatProdServCodes = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<SatProdservCode[]>(
    {
      queryKey: ["sat-prodserv-codes"],
      queryFn: getSatProdservCodes,
    },
    { toastId: "sat-prodserv-codes-refetch-error" },
  );

  const satProdservCodes = data ?? [];

  return {
    satProdservCodes,
    isLoading,
    isInitialError,
    error,
  };
};
