import { v1_api } from "@/src/api/v1.api";
import type { StockMovement } from "../interfaces/stock-movements.interface";


export const getStockMovements = async (): Promise<StockMovement[]> => {
  const response = await v1_api.get<StockMovement[]>("/inventarios/movimientos/");
  return response.data;
}