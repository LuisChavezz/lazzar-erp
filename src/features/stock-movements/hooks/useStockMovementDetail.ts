import { useQuery } from "@tanstack/react-query";
import { getStockMovementDetail } from "../services/actions";
import type { StockMovementDetail } from "../interfaces/stock-movements.interface";

export const useStockMovementDetail = (id: number) => {
  return useQuery<StockMovementDetail>({
    queryKey: ["stock-movement-detail", id],
    queryFn: () => getStockMovementDetail(id),
    enabled: id > 0,
  });
};
