import { v1_api } from "@/src/api/v1.api";
import {
  Invoice,
  CreateInvoiceFromOrderBody,
} from "../interfaces/invoice.interface";

export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await v1_api.get<Invoice[]>("/finanzas/facturas/");
  return response.data;
};

/**
 * Crea una factura a partir de un pedido. El servidor resuelve todo el detalle
 * desde el pedido y devuelve la `Factura` con la misma forma que el resto del
 * módulo. El error se deja propagar tal cual para que el hook distinga entre el
 * `400` (pedido ya facturado) y el `404` (pedido inexistente).
 */
export const createInvoiceFromOrder = async (
  body: CreateInvoiceFromOrderBody,
): Promise<Invoice> => {
  const { data } = await v1_api.post<Invoice>(
    "/finanzas/facturas/desde-pedido/",
    body,
  );
  return data;
};
