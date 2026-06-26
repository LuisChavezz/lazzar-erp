import { v1_api } from "@/src/api/v1.api";
import {
  PurchaseOrder,
  PurchaseOrderDetail,
  UpdatePurchaseOrderParams,
} from "../interfaces/purchase-order.interface";
import {
  PurchaseOrderOnboardingData,
  PurchaseOrderOnboardingPayload,
  PurchaseOrderOnboardingResponse,
} from "../interfaces/purchase-order-onboarding.interface";

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const response = await v1_api.get<PurchaseOrder[]>("/compras/ordenes/");
  return response.data;
}

export const getPurchaseOrder = async (
  id: number,
): Promise<PurchaseOrderDetail> => {
  const response = await v1_api.get<PurchaseOrderDetail>(
    `/compras/ordenes/${id}/`,
  );
  return response.data;
}

export const getPurchaseOrderOnboardingData = async (): Promise<PurchaseOrderOnboardingData> => {
  const response = await v1_api.get<PurchaseOrderOnboardingData>("/compras/ordenes/onboarding/");
  return response.data;
}

export const postPurchaseOrder = async (
  data: PurchaseOrderOnboardingPayload,
): Promise<PurchaseOrderOnboardingResponse> => {
  const response = await v1_api.post<PurchaseOrderOnboardingResponse>(
    "/compras/ordenes/onboarding/",
    data,
  );
  return response.data;
}

export const confirmPurchaseOrder = async (ordenCompraId: number): Promise<void> => {
  await v1_api.post(`/compras/ordenes/${ordenCompraId}/aceptar/`);
}

export const updatePurchaseOrder = async ({
  pk,
  body,
}: UpdatePurchaseOrderParams): Promise<PurchaseOrder> => {
  const response = await v1_api.put<PurchaseOrder>(
    `/compras/ordenes/${pk}/`,
    body,
  );
  return response.data;
}