import { v1_api } from "@/src/api/v1.api";
import { Supplier, SupplierCreate } from "../interfaces/supplier.interface";

export const createSupplier = async (supplierData: SupplierCreate): Promise<Supplier> => {
  const response = await v1_api.post<Supplier>("/terceros/proveedores/", supplierData);
  return response.data;
};