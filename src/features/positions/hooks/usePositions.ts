import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getPositions } from "../services/actions";
import { Position } from "../interfaces/position.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const usePositions = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Position[]>(
    {
      queryKey: ["positions"],
      queryFn: getPositions,
    },
    { toastId: "positions-refetch-error" },
  );

  const positions = data ?? [];

  return {
    positions,
    isLoading,
    isInitialError,
    error,
  };
};
