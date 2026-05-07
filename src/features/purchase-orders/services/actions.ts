import { v1_api } from "@/src/api/v1.api";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";


export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const response = await v1_api.get<PurchaseOrder[]>("/compras/ordenes/");
  return response.data;
}