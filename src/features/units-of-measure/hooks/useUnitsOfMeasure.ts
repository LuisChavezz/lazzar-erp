import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getUnitsOfMeasure } from "../services/actions";
import { UnitOfMeasure } from "../interfaces/unit-of-measure.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useUnitsOfMeasure = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<UnitOfMeasure[]>(
    {
      queryKey: ["units-of-measure"],
      queryFn: getUnitsOfMeasure,
    },
    { toastId: "units-of-measure-refetch-error" },
  );

  const units = data ?? [];

  return {
    units,
    isLoading,
    isInitialError,
    error,
  };
};
