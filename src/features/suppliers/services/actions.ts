import { v1_api } from "@/src/api/v1.api";
import { Supplier, SupplierCreate } from "../interfaces/supplier.interface";


export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await v1_api.get<Supplier[]>("/terceros/proveedores/");
  return response.data;
};

export const createSupplier = async (supplierData: SupplierCreate): Promise<Supplier> => {
  const response = await v1_api.post<Supplier>("/terceros/proveedores/", supplierData);
  return response.data;
};

export const updateSupplier = async (id: number, supplierData: SupplierCreate): Promise<Supplier> => {
  const response = await v1_api.put<Supplier>(`/terceros/proveedores/${id}/`, supplierData);
  return response.data;
}

export const deleteSupplier = async (id: number): Promise<void> => {
  await v1_api.delete(`/terceros/proveedores/${id}/`);
}