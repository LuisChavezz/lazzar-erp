import { useQuery } from "@tanstack/react-query";
import { getStockItems } from "../services/actions";
import { StockItem } from "../interfaces/stock.interface";

export const useStockItems = () => {
  return useQuery<StockItem[]>({
    queryKey: ["stock-items"],
    queryFn: getStockItems,
  });
};
