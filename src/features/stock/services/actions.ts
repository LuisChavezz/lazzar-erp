import { v1_api } from "@/src/api/v1.api";
import { StockItem } from "../interfaces/stock.interface";


export const getStockItems = async (): Promise<StockItem[]> => {
  const response = await v1_api.get<StockItem[]>("/inventarios/existencias/");
  return response.data;
}