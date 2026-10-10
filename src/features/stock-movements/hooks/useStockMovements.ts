import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getStockMovements } from "../services/actions";
import type { StockMovement } from "../interfaces/stock-movements.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useStockMovements = () => {
  const { data, isLoading, isInitialError, error, refetch, isFetching } = useGuardedQuery<StockMovement[]>(
    {
      queryKey: ["stockMovements"],
      queryFn: getStockMovements,
    },
    { toastId: "stock-movements-refetch-error" },
  );

  const stockMovements = data ?? [];

  return {
    stockMovements,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};