import { v1_api } from "@/src/api/v1.api";
import { PurchaseOrder, PurchaseOrderCreate } from "../interfaces/purchase-order.interface";


export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const response = await v1_api.get<PurchaseOrder[]>("/compras/ordenes/");
  return response.data;
}

export const createPurchaseOrder = async (purchaseOrder: PurchaseOrderCreate): Promise<PurchaseOrder> => {
  const response = await v1_api.post<PurchaseOrder>("/compras/ordenes/", purchaseOrder);
  return response.data;
}