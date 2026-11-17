import { v1_api } from "@/src/api/v1.api";
import type {
  ConfirmarExistenciasResponse,
  CreateResurtidoBody,
  CreateResurtidoResponse,
  VariantAvailability,
  ResurtidoCatalogItem,
  CrearOpBody,
  CrearOpResponse,
  PreOrderDetail,
  PreOrderHistoryEvent,
  PreOrderListItem,
  PreOrderOrigen,
  PreOrderStatus,
} from "../interfaces/pre-order.interface";

const BASE = "/produccion/pre-ordenes/";

/** Listado; acepta `pedido` y `estatus`. Sin paginación. */
export const getPreOrders = async (params?: {
  pedido?: number;
  estatus?: PreOrderStatus;
  origen?: PreOrderOrigen;
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

/** Alta de un resurtido de stock (sin pedido). Nace en `pendiente_validar`. */
export const createResurtido = async (body: CreateResurtidoBody): Promise<CreateResurtidoResponse> => {
  const response = await v1_api.post<CreateResurtidoResponse>(BASE, body);
  return response.data;
};

/** Producción acepta un resurtido: pasa a `pendiente_validar` (o `en_compra` si todo es de compra). */
export const aceptarPreOrden = async (id: number): Promise<unknown> => {
  const response = await v1_api.post(`${BASE}${id}/aceptar/`);
  return response.data;
};

export const rechazarPreOrden = async (id: number, motivo: string): Promise<unknown> => {
  const response = await v1_api.post(`${BASE}${id}/rechazar/`, { motivo });
  return response.data;
};

/**
 * Existencia, por fabricar, por comprar, comprometido y disponible por
 * variante en una sucursal. Se acepta la lista directa o un objeto por
 * variante; se normaliza a lista.
 */
export const getDisponibilidad = async (body: {
  sucursal: number;
  variantes: number[];
  productos: number[];
}): Promise<VariantAvailability[]> => {
  const response = await v1_api.post<
    VariantAvailability[] | Record<string, Omit<VariantAvailability, "variante">>
  >(`${BASE}disponibilidad/`, body);
  const data = response.data;
  if (Array.isArray(data)) return data;
  return Object.entries(data ?? {}).map(([variante, v]) => ({ ...v, variante: Number(variante) }));
};

/**
 * Buscador del alta de resurtido: por nombre, código, clave Proscai o SKU;
 * `tipo` filtra `MP`, `PT`, `COMPRAS` (separados por coma). Paginado.
 */
export const searchResurtidoCatalog = async (params: {
  q: string;
  tipo?: string;
  limit: number;
  offset: number;
}): Promise<{ count: number; results: ResurtidoCatalogItem[] }> => {
  const response = await v1_api.get<{ count: number; results: ResurtidoCatalogItem[] }>(
    `${BASE}catalogo-resurtido/`,
    { params: { ...params, tipo: params.tipo || undefined } },
  );
  return response.data;
};
