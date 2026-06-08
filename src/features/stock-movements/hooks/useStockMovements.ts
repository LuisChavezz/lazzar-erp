import { useQuery } from "@tanstack/react-query";
import { getStockMovements } from "../services/actions";
import type { StockMovement } from "../interfaces/stock-movements.interface";

export const useStockMovements = () => {
  const {
    data: stockMovements = [],
    isLoading,
    isError,
    error,
  } = useQuery<StockMovement[]>({
    queryKey: ["stockMovements"],
    queryFn: getStockMovements,
  });

  return {
    stockMovements,
    isLoading,
    isError,
    error,
  };
};