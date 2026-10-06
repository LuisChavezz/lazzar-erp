import { v1_api } from "@/src/api/v1.api";
import { Supplier, SupplierCreate, SupplierUpdate } from "../interfaces/supplier.interface";
import type {
  SupplierPurchaseOrderHistoryParams,
  SupplierPurchaseOrderHistoryResponse,
} from "../interfaces/supplier-purchase-order-history.interface";


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

export const createSupplier = async (supplierData: SupplierCreate): Promise<Supplier> => {
  const response = await v1_api.post<Supplier>("/terceros/proveedores/", supplierData);
  return response.data;
};

export const updateSupplier = async (id: number, supplierData: SupplierUpdate): Promise<Supplier> => {
  const response = await v1_api.put<Supplier>(`/terceros/proveedores/${id}/`, supplierData);
  return response.data;
}

export const deleteSupplier = async (id: number): Promise<void> => {
  await v1_api.delete(`/terceros/proveedores/${id}/`);
}
