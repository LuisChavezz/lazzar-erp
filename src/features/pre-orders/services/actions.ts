import { v1_api } from "@/src/api/v1.api";
import type {
  ConfirmarExistenciasResponse,
  CrearOpBody,
  CrearOpResponse,
  PreOrderDetail,
  PreOrderHistoryEvent,
  PreOrderListItem,
  PreOrderStatus,
} from "../interfaces/pre-order.interface";

const BASE = "/produccion/pre-ordenes/";

/** Listado; acepta `pedido` y `estatus`. Sin paginación. */
export const getPreOrders = async (params?: {
  pedido?: number;
  estatus?: PreOrderStatus;
}): Promise<PreOrderListItem[]> => {
  const response = await v1_api.get<PreOrderListItem[]>(BASE, { params });
  return response.data;
};

export const getPreOrder = async (id: number): Promise<PreOrderDetail> => {
  const response = await v1_api.get<PreOrderDetail>(`${BASE}${id}/`);
  return response.data;
};

/**
 * Almacén confirma. Con faltantes, el backend crea una OC en Borrador (sin
 * proveedor) solo con esos materiales; su id llega en `orden_compra_creada`.
 */
export const confirmarExistencias = async (id: number): Promise<ConfirmarExistenciasResponse> => {
  const response = await v1_api.post<ConfirmarExistenciasResponse>(
    `${BASE}${id}/confirmar-existencias/`,
  );
  return response.data;
};

/** Solo en `lista`. Responde como el onboarding de OP + `pre_orden`/`estatus`. */
export const crearOpDesdePreOrden = async (
  id: number,
  body: CrearOpBody,
): Promise<CrearOpResponse> => {
  const response = await v1_api.post<CrearOpResponse>(`${BASE}${id}/crear-op/`, body);
  return response.data;
};

export const cancelarPreOrden = async (id: number): Promise<unknown> => {
  const response = await v1_api.post(`${BASE}${id}/cancelar/`);
  return response.data;
};

export const getPreOrderHistory = async (id: number): Promise<PreOrderHistoryEvent[]> => {
  const response = await v1_api.get<PreOrderHistoryEvent[]>(`${BASE}${id}/historial/`);
  return response.data;
};

export interface PreOrderSummary {
  urgentes: number;
  por_validar: number;
  en_compra: number;
  listas: number;
}

/** Contadores para el badge del menú lateral. */
export const getPreOrderSummary = async (): Promise<PreOrderSummary> => {
  const response = await v1_api.get<PreOrderSummary>(`${BASE}resumen/`);
  return response.data;
};
