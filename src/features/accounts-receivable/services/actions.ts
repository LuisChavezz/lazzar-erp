import { v1_api } from "@/src/api/v1.api";
import type {
  RegisterPendingInvoiceBody,
  RegisterPendingInvoiceResponse,
} from "../interfaces/register-pending-invoice.interface";

/**
 * Registra manualmente una factura pendiente por cobrar. El backend crea la
 * factura y su cuenta por cobrar asociada, devolviendo ambas (201). El error se
 * deja propagar tal cual para que el hook mapee los errores de campo del `400`.
 */
export const registerPendingInvoice = async (
  body: RegisterPendingInvoiceBody,
): Promise<RegisterPendingInvoiceResponse> => {
  const { data } = await v1_api.post<RegisterPendingInvoiceResponse>(
    "/finanzas/facturas/registrar-pendiente-cobro/",
    body,
  );
  return data;
};
