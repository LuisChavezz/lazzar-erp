import { v1_api } from "@/src/api/v1.api";
import type {
  CuentaPorPagar,
  CuentaPorPagarQueryParams,
} from "../interfaces/cuenta-por-pagar.interface";
import type { CreatePagoPayload, Pago } from "../interfaces/payment.interface";
import type { MovimientoBancario } from "../interfaces/movimiento-bancario.interface";

/**
 * Lista las cuentas por pagar desde `GET /finanzas/cuentas-por-pagar/`. Espejo
 * exacto de `getCuentasPorCobrar` en CxC: el backend ya acota los resultados a
 * la empresa del usuario autenticado, y los parámetros son opcionales — Axios
 * omite las llaves `undefined`, así que solo viajan las que se fijen.
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
 * Lista los pagos desde `GET /finanzas/pagos/`.
 *
 * Va SIN parámetros a propósito: el endpoint acepta filtros de servidor
 * (`proveedor`, `metodo_pago`, `estatus`, `cuenta_bancaria`, `referencia`,
 * rango de `fecha_pago`, `ordering`) pero `DataTable` filtra y busca en memoria
 * sobre el arreglo completo y no expone un puente hacia parámetros de servidor.
 * Se trae la lista entera —el backend ya la acota por empresa— y una sola
 * entrada de caché sirve a toda la pantalla, igual que en `banks`.
 */
export const getPagos = async (): Promise<Pago[]> => {
  const { data } = await v1_api.get<Pago[]>("/finanzas/pagos/");
  return data;
};

/**
 * Alta de un pago con sus líneas anidadas.
 *
 * El cuerpo NO lleva `empresa` (la resuelve el backend) ni el FK padre dentro de
 * cada renglón de `pago_detalles` (es de solo lectura en el serializer). El
 * error se deja propagar tal cual para que el hook lo normalice y lo reparta
 * entre cabecera y líneas.
 */
export const createPago = async (payload: CreatePagoPayload): Promise<Pago> => {
  const { data } = await v1_api.post<Pago>("/finanzas/pagos/", payload);
  return data;
};

/**
 * Cancela un pago: `POST /finanzas/pagos/{id}/cancelar/`.
 *
 * El backend revierte los saldos de las CxP aplicadas, marca el movimiento
 * bancario como `Cancelado` y deja el pago en `estatus: "Cancelado"`. Devuelve
 * 200 con el documento. Es idempotente: cancelar un pago ya cancelado no falla —
 * aun así la UI solo ofrece la acción sobre pagos `Aplicado`.
 */
export const cancelarPago = async (id: number): Promise<Pago> => {
  const { data } = await v1_api.post<Pago>(`/finanzas/pagos/${id}/cancelar/`);
  return data;
};

/**
 * Movimientos bancarios generados por UN pago:
 * `GET /finanzas/movimientos-bancarios/?pago={id}`. Arreglo plano, sin
 * paginación.
 */
export const getMovimientosByPago = async (
  pagoId: number,
): Promise<MovimientoBancario[]> => {
  const { data } = await v1_api.get<MovimientoBancario[]>(
    "/finanzas/movimientos-bancarios/",
    { params: { pago: pagoId } },
  );
  return data;
};
