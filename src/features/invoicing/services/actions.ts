import { v1_api } from "@/src/api/v1.api";
import { Factura } from "../interfaces/invoice.interface";

export const getInvoices = async (): Promise<Factura[]> => {
  const response = await v1_api.get<Factura[]>("/finanzas/facturas/");
  return response.data;
};
