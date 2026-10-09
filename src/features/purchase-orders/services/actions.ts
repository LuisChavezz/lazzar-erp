import { v1_api } from "@/src/api/v1.api";
import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";
import {
  CancelPurchaseOrderParams,
  PurchaseOrder,
  PurchaseOrderDetail,
  UpdatePurchaseOrderParams,
  UpdatePurchaseOrderResponse,
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

/**
 * Cancela la orden: queda en estatus 6 (CANCELADA), conserva `activo` y sigue
 * visible en listado y detalle. Distinto de `deletePurchaseOrder`, que borra un
 * error de captura.
 */
export const cancelPurchaseOrder = async ({
  id,
  payload,
}: CancelPurchaseOrderParams): Promise<PurchaseOrder> => {
  const response = await v1_api.post<PurchaseOrder>(
    `/compras/ordenes/${id}/cancelar/`,
    payload,
  );
  return response.data;
}

export const updatePurchaseOrder = async ({
  pk,
  body,
}: UpdatePurchaseOrderParams): Promise<UpdatePurchaseOrderResponse> => {
  const response = await v1_api.put<UpdatePurchaseOrderResponse>(
    `/compras/ordenes/${pk}/`,
    body,
  );
  return response.data;
}

export const deletePurchaseOrder = async (pk: number): Promise<void> => {
  await v1_api.delete(`/compras/ordenes/${pk}/`);
}

/**
 * Indicadores de órdenes de compra (`GET /compras/ordenes/kpis/`, EC-432),
 * calculados por el backend. Sin params: el endpoint no acepta ninguno.
 */
export const getPurchaseOrderKpis = async (): Promise<PurchaseOrderKpis> => {
  const response = await v1_api.get<PurchaseOrderKpis>("/compras/ordenes/kpis/");
  return response.data;
};