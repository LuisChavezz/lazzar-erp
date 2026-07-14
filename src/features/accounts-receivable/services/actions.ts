import { v1_api } from "@/src/api/v1.api";
import type {
  CuentaPorCobrar,
  CuentaPorCobrarQueryParams,
} from "../interfaces/accounts-receivable.interface";
import type {
  RegisterPendingInvoiceBody,
  RegisterPendingInvoiceResponse,
} from "../interfaces/register-pending-invoice.interface";

/**
 * Lista las cuentas por cobrar desde `GET /finanzas/cuentas-por-cobrar/`. El
 * backend ya acota los resultados a las facturas activas de la empresa del
 * usuario autenticado, así que no hace falta filtrar por empresa en el cliente.
 * Los parámetros son opcionales; Axios omite las llaves `undefined`, por lo que
 * solo se envían las que se fijen.
 */
export const getCuentasPorCobrar = async (
  params?: CuentaPorCobrarQueryParams,
): Promise<CuentaPorCobrar[]> => {
  const { data } = await v1_api.get<CuentaPorCobrar[]>(
    "/finanzas/cuentas-por-cobrar/",
    { params },
  );
  return data;
};

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
