import { v1_api } from "@/src/api/v1.api";
import type { StockMovement, StockMovementDetail } from "../interfaces/stock-movements.interface";

export interface CreateStockMovementPayload {
  almacen: number;
  /**
   * Un renglón es de una variante de catálogo (`producto_variante`) o, solo en
   * ENTRADA, de una muestra por su SKU (`sku_muestra`, sin producto).
   */
  items: (
    | { producto_variante: number; cantidad: string; ubicacion: number }
    | { sku_muestra: string; cantidad: string; ubicacion: number }
  )[];
  /** Notas del movimiento. Opcional en los tres endpoints (entrada/salida/ajuste). */
  observaciones?: string;
  /**
   * Pedido al que se vincula el movimiento. Opcional — se omite por completo
   * cuando no hay pedido (nunca se envía `null` ni `0`). Un pedido inválido/
   * inexistente hace que el backend rechace TODO el movimiento con un `400`
   * `{ "pedido": "Pedido no encontrado." }`.
   */
  pedido?: number;
}

/** Un resultado del autocompletado de muestras (`GET /inventarios/skus-muestra/`). */
export interface SampleSkuResult {
  variante_produccion: number;
  sku_muestra: string;
  pedido_folio: string | null;
  nombre: string | null;
  talla: string | null;
}

/** Busca por SKU o folio del pedido; mínimo 1 carácter, máximo 10 resultados. */
export const searchSampleSkus = async (search: string): Promise<SampleSkuResult[]> => {
  const response = await v1_api.get<SampleSkuResult[]>("/inventarios/skus-muestra/", {
    params: { search },
  });
  return response.data;
};

export const getStockMovements = async (): Promise<StockMovement[]> => {
  const response = await v1_api.get<StockMovement[]>("/inventarios/movimientos/");
  return response.data;
};

export const createStockMovement = async ({
  operationType,
  data,
}: {
  operationType: string;
  data: CreateStockMovementPayload;
}): Promise<StockMovement> => {
  const response = await v1_api.post<StockMovement>(
    `/inventarios/operaciones/${operationType.toLowerCase()}`,
    data,
  );
  return response.data;
};

export const getStockMovementDetail = async (
  id: number
): Promise<StockMovementDetail> => {
  const response = await v1_api.get<StockMovementDetail>(
    `/inventarios/movimientos/${id}/detalles/`
  );
  return response.data;
};