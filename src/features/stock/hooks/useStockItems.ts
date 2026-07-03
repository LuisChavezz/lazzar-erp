import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStockItems, type StockItemsFilters } from "../services/actions";
import { StockItem } from "../interfaces/stock.interface";

export const useStockItems = (
  filters?: StockItemsFilters,
  options?: { enabled?: boolean },
) => {
  return useQuery<StockItem[]>({
    queryKey: ["stock-items", filters],
    queryFn: () => getStockItems(filters),
    // Permite no consultar mientras no haya un almacén seleccionado.
    enabled: options?.enabled ?? true,
    // Al cambiar de almacén se mantienen los datos previos visibles mientras
    // llega la nueva página, evitando un parpadeo a pantalla de carga completa.
    placeholderData: keepPreviousData,
  });
};
