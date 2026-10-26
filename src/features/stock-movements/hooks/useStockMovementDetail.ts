import { useQuery } from "@tanstack/react-query";
import { STOCK_MOVEMENT_DETAIL_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { getStockMovementDetail } from "../services/actions";
import type { StockMovementDetail } from "../interfaces/stock-movements.interface";

export const useStockMovementDetail = (id: number) => {
  return useQuery<StockMovementDetail>({
    queryKey: [...STOCK_MOVEMENT_DETAIL_QUERY_KEY, id],
    queryFn: () => getStockMovementDetail(id),
    enabled: id > 0,
  });
};
