import { useQuery } from "@tanstack/react-query";
import { STOCK_MOVEMENT_DETAIL_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { getFormalStockMovementDetail, getStockMovementDetail } from "../services/actions";
import type { StockMovementDetail } from "../interfaces/stock-movements.interface";

/**
 * `evento`: id del listado de movimientos (auditoría). `formal`: id del
 * movimiento real, el que mandan los `documentos` de OC, pedido, etc.
 */
export type StockMovementIdSource = "evento" | "formal";

export const useStockMovementDetail = (id: number, fuente: StockMovementIdSource = "evento") => {
  return useQuery<StockMovementDetail>({
    queryKey: [...STOCK_MOVEMENT_DETAIL_QUERY_KEY, fuente, id],
    queryFn: () => (fuente === "formal" ? getFormalStockMovementDetail(id) : getStockMovementDetail(id)),
    enabled: id > 0,
  });
};
