import { useQuery } from "@tanstack/react-query";
import { getStockItems, type StockItemsFilters } from "../services/actions";
import { StockItem } from "../interfaces/stock.interface";

export const useStockItems = (filters?: StockItemsFilters) => {
  return useQuery<StockItem[]>({
    queryKey: ["stock-items", filters],
    queryFn: () => getStockItems(filters),
  });
};
