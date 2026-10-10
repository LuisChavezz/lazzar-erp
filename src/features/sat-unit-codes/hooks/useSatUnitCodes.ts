import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSatUnitCodes } from "../services/actions";
import { SatUnitCode } from "../interfaces/sat-unit-code.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useSatUnitCodes = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<SatUnitCode[]>(
    {
      queryKey: ["sat-unit-codes"],
      queryFn: getSatUnitCodes,
    },
    { toastId: "sat-unit-codes-refetch-error" },
  );

  const satUnitCodes = data ?? [];

  return {
    satUnitCodes,
    isLoading,
    isInitialError,
    error,
  };
};
