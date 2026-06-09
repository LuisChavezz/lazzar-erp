import { v1_api } from "@/src/api/v1.api";
import { StockItem } from "../interfaces/stock.interface";

export interface StockItemsFilters {
  almacen_id?: number;
  producto_variante_id?: number;
}

export const getStockItems = async (filters?: StockItemsFilters): Promise<StockItem[]> => {
  
  // Construir query params dinámicamente según los filtros proporcionados.
  const params = new URLSearchParams();
  if (filters?.almacen_id) params.append("almacen_id", String(filters.almacen_id));
  if (filters?.producto_variante_id) params.append("producto_variante_id", String(filters.producto_variante_id));

  const query = params.toString();
  const url = `/inventarios/existencias/${query ? `?${query}` : ""}`;

  const response = await v1_api.get<StockItem[]>(url);
  return response.data;
}