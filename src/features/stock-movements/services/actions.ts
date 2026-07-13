import { v1_api } from "@/src/api/v1.api";
import type { StockMovement, StockMovementDetail } from "../interfaces/stock-movements.interface";

export interface CreateStockMovementPayload {
  almacen: number;
  items: {
    producto_variante: number;
    cantidad: string;
    ubicacion: number;
  }[];
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