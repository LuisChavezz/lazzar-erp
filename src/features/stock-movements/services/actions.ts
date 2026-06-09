import { v1_api } from "@/src/api/v1.api";
import type { StockMovement } from "../interfaces/stock-movements.interface";

export interface CreateStockMovementPayload {
  almacen: number;
  items: {
    producto_variante: number;
    cantidad: string;
    ubicacion: number;
  }[];
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