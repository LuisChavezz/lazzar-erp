import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type {
  StockDigitalDetalle,
  StockDigitalFila,
} from "../interfaces/digital-stock.interface";

/**
 * Página del stock digital (`?page=&page_size=` → `{count, next, previous,
 * results}`). Los filtros llegan ya validados desde `useServerTable`.
 */
export const getDigitalStockPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<StockDigitalFila>> => {
  const { data } = await v1_api.get<PaginatedListResponse<StockDigitalFila>>(
    "/ventas/stock-digital/",
    { params },
  );
  return data;
};

/**
 * Detalle de un SKU: totales, existencia por ALM-00, pedidos que lo
 * comprometen y OP/OC por llegar. 404 si la variante no es de la empresa.
 */
export const getDigitalStockDetail = async (varianteId: number): Promise<StockDigitalDetalle> => {
  const { data } = await v1_api.get<StockDigitalDetalle>(`/ventas/stock-digital/${varianteId}/`);
  return data;
};
