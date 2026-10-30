import { v1_api } from "@/src/api/v1.api";
import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";
import type {
  PurchaseOrderCriticalPath,
  PurchaseOrderCriticalPathUpdateBody,
} from "../interfaces/purchase-order-critical-path.interface";
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
  PurchaseOrderOnboardingVariante,
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

/** Tope de variantes por búsqueda: sin `limit` el backend las devuelve todas. */
const VARIANT_SEARCH_LIMIT = 50;

/**
 * Búsqueda de variantes (SKU) de producto terminado para los renglones de una
 * OC de PT (EC-657), sobre el mismo onboarding. `producto_q` busca en SKU y
 * nombre; vacío devuelve las primeras por SKU. Solo se toma
 * `busqueda.variantes`: el mismo `producto_q` y el `limit` también recortan
 * productos y proveedores, que por eso nunca se leen de esta respuesta.
 */
export const searchPurchaseOrderVariants = async (
  productoQ: string,
): Promise<PurchaseOrderOnboardingVariante[]> => {
  const response = await v1_api.get<PurchaseOrderOnboardingData>("/compras/ordenes/onboarding/", {
    params: {
      tipo_compra: "PT",
      producto_q: productoQ || undefined,
      limit: VARIANT_SEARCH_LIMIT,
    },
  });
  return response.data.busqueda.variantes;
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

const criticalPathUrl = (ocId: number) => `/compras/ordenes/${ocId}/ruta-critica/`;

/**
 * Ruta crítica de una OC (EC-488). Solo lectura: una OC sin captura responde
 * los campos en `null` con `updated_at: null`. Una OC de otra empresa,
 * inactiva o inexistente responde 404.
 */
export const getPurchaseOrderCriticalPath = async (
  ocId: number,
): Promise<PurchaseOrderCriticalPath> => {
  const response = await v1_api.get<PurchaseOrderCriticalPath>(criticalPathUrl(ocId));
  return response.data;
};

/** PATCH parcial. Responde el registro completo (misma forma que el GET). */
export const updatePurchaseOrderCriticalPath = async (
  ocId: number,
  body: PurchaseOrderCriticalPathUpdateBody,
): Promise<PurchaseOrderCriticalPath> => {
  const response = await v1_api.patch<PurchaseOrderCriticalPath>(criticalPathUrl(ocId), body);
  return response.data;
};