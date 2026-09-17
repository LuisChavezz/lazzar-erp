import { v1_api } from "@/src/api/v1.api";
import type {
  CreateCuentaPorPagarPayload,
  CuentaPorPagar,
  CuentaPorPagarQueryParams,
} from "../interfaces/accounts-payable.interface";

/**
 * Lista las cuentas por pagar desde `GET /finanzas/cuentas-por-pagar/`. El
 * backend ya acota los resultados a la empresa del usuario autenticado, y los
 * parámetros son opcionales — Axios omite las llaves `undefined`, así que solo
 * viajan las que se fijen.
 *
 * No hay acción de detalle a propósito: `GET /{id}/` usa el mismo serializer que
 * el listado, así que el renglón ya cargado ES el detalle.
 */
export const getCuentasPorPagar = async (
  params?: CuentaPorPagarQueryParams,
): Promise<CuentaPorPagar[]> => {
  const { data } = await v1_api.get<CuentaPorPagar[]>(
    "/finanzas/cuentas-por-pagar/",
    { params },
  );
  return data;
};

/**
 * Alta manual de una cuenta por pagar. Devuelve 201 con la cuenta creada, que ya
 * nace con `saldo = total` y `estatus: "Pendiente"`.
 *
 * El error se deja propagar tal cual para que el hook lo normalice con
 * `parseCuentaPorPagarError` y lo reparta entre campos y banner.
 */
export const createCuentaPorPagar = async (
  payload: CreateCuentaPorPagarPayload,
): Promise<CuentaPorPagar> => {
  const { data } = await v1_api.post<CuentaPorPagar>(
    "/finanzas/cuentas-por-pagar/",
    payload,
  );
  return data;
};

/**
 * Elimina FÍSICAMENTE una cuenta por pagar: `DELETE /finanzas/cuentas-por-pagar/{id}/`
 * (204). No es baja lógica: el registro desaparece.
 *
 * El backend solo lo permite si la cuenta NO tiene pagos `Aplicado`: si los
 * tiene responde 400 pidiendo cancelarlos primero. Las líneas de pagos en
 * `Borrador` o `Cancelado` que apunten a ella se borran en cascada. Si otra
 * operación tiene bloqueadas la cuenta o sus pagos, desiste con un 409 que el
 * cliente puede reintentar.
 */
export const deleteCuentaPorPagar = async (id: number): Promise<void> => {
  await v1_api.delete(`/finanzas/cuentas-por-pagar/${id}/`);
};
