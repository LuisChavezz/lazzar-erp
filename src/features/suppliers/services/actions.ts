import { v1_api } from "@/src/api/v1.api";
import { Supplier, SupplierCreate, SupplierUpdate } from "../interfaces/supplier.interface";
import type {
  SupplierPurchaseOrderHistoryParams,
  SupplierPurchaseOrderHistoryResponse,
} from "../interfaces/supplier-purchase-order-history.interface";
import type { SupplierKpis } from "../interfaces/supplier-kpis.interface";
import type { SupplierKpiDetail, SupplierKpiFactor } from "../interfaces/supplier-kpi-detail.interface";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";

/**
 * Una PÁGINA del listado de proveedores (`?limit=&offset=` → `{count, next,
 * previous, results}`) con la búsqueda y el orden de la tabla en modo servidor
 * (`useSuppliersTable`). Sin `limit` el mismo endpoint responde el arreglo
 * completo, que es lo que usa el catálogo (`getSuppliers`). Sin `activo`: el
 * default del backend (`true`) es el listado de siempre, solo activos.
 */
export const getSuppliersPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<Supplier>> => {
  const response = await v1_api.get<PaginatedListResponse<Supplier>>("/terceros/proveedores/", {
    params,
  });
  return response.data;
};


export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await v1_api.get<Supplier[]>("/terceros/proveedores/");
  return response.data;
};

/**
 * Detalle de un proveedor. Mismo serializer (y misma forma) que el listado.
 * 404 si no existe, es de otra empresa o está inactivo.
 */
export const getSupplier = async (id: number): Promise<Supplier> => {
  const response = await v1_api.get<Supplier>(`/terceros/proveedores/${id}/`);
  return response.data;
};

/** Historial de órdenes de compra del proveedor, paginado en el servidor. */
export const getSupplierPurchaseOrderHistory = async (
  id: number,
  params: SupplierPurchaseOrderHistoryParams,
): Promise<SupplierPurchaseOrderHistoryResponse> => {
  const response = await v1_api.get<SupplierPurchaseOrderHistoryResponse>(
    `/terceros/proveedores/${id}/historial-ordenes-compra/`,
    { params },
  );
  return response.data;
};

/**
 * Indicadores por proveedor (EC-436). Sin parámetros: todo el histórico. El
 * backend responde 400 a un parámetro que no soporta, no lo ignora.
 */
export const getSupplierKpis = async (): Promise<SupplierKpis> => {
  const response = await v1_api.get<SupplierKpis>("/terceros/proveedores/kpis/");
  return response.data;
};

/**
 * Registros detrás de un factor del scorecard de un proveedor. Solo `factor`:
 * sin `sucursal` ni fechas, igual que `getSupplierKpis`, para que cuadre con
 * las tarjetas.
 */
export const getSupplierKpiDetail = async <F extends SupplierKpiFactor>(
  id: number,
  factor: F,
): Promise<SupplierKpiDetail<F>> => {
  const response = await v1_api.get<SupplierKpiDetail<F>>(`/terceros/proveedores/${id}/kpis-detalle/`, {
    params: { factor },
  });
  return response.data;
};

export const createSupplier = async (supplierData: SupplierCreate): Promise<Supplier> => {
  const response = await v1_api.post<Supplier>("/terceros/proveedores/", supplierData);
  return response.data;
};

export const updateSupplier = async (id: number, supplierData: SupplierUpdate): Promise<Supplier> => {
  const response = await v1_api.put<Supplier>(`/terceros/proveedores/${id}/`, supplierData);
  return response.data;
}

/** Marca o desmarca al proveedor como maquilero (`PATCH`, solo ese campo). */
export const setSupplierMaquilero = async (id: number, es_maquilero: boolean): Promise<Supplier> => {
  const response = await v1_api.patch<Supplier>(`/terceros/proveedores/${id}/`, { es_maquilero });
  return response.data;
};

/** Proveedores marcados como maquileros (centros de confección). */
export const getMaquileros = async (): Promise<Supplier[]> => {
  const response = await v1_api.get<Supplier[]>("/terceros/proveedores/", {
    params: { es_maquilero: true },
  });
  return response.data;
};

export const deleteSupplier = async (id: number): Promise<void> => {
  await v1_api.delete(`/terceros/proveedores/${id}/`);
}
