import { v1_api } from "@/src/api/v1.api";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

/**
 * Clientes de contabilidad (`GET /finanzas/clientes-contabilidad/`).
 *
 * Sin parámetro el backend devuelve SOLO los activos; `?activo=false`, solo los
 * dados de baja (nucleo-erp #799). No hay forma de pedir ambos a la vez. Se
 * manda exactamente `activo=false` o nada: el backend toma CUALQUIER otro valor
 * no reconocido como `false`, así que nunca se le pasa un valor libre.
 */
export const getAccountingCustomers = async (
  { activo }: { activo: boolean } = { activo: true },
): Promise<AccountingCustomer[]> => {
  const response = await v1_api.get<AccountingCustomer[]>("/finanzas/clientes-contabilidad/", {
    params: activo ? undefined : { activo: "false" },
  });
  return response.data;
};
