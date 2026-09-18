import { v1_api } from "@/src/api/v1.api";
import type {
  ConciliacionBancaria,
  ConciliacionBancariaQueryParams,
  PrepararConciliacionPayload,
  PrepararConciliacionResponse,
} from "../interfaces/bank-reconciliation.interface";

/**
 * Listado de conciliaciones: `GET /finanzas/conciliaciones-bancarias/`.
 *
 * Devuelve un ARREGLO PLANO, sin envoltorio de paginación. El backend ya acota
 * los resultados a la empresa del usuario autenticado.
 *
 * A diferencia de los catálogos de finanzas, aquí los parámetros SÍ se usan: el
 * rango filtra por SOLAPAMIENTO (ver `ConciliacionBancariaQueryParams`) y esa
 * es la consulta con la que la pantalla detecta un periodo ya cerrado antes de
 * preparar. Axios omite las llaves `undefined`.
 */
export const getConciliaciones = async (
  params?: ConciliacionBancariaQueryParams,
): Promise<ConciliacionBancaria[]> => {
  const { data } = await v1_api.get<ConciliacionBancaria[]>(
    "/finanzas/conciliaciones-bancarias/",
    { params },
  );
  return data;
};

/**
 * Prepara la conciliación de un periodo:
 * `POST /finanzas/conciliaciones-bancarias/preparar/`.
 *
 * ES EL ÚNICO CAMINO DE ALTA de esta pantalla; nunca un `POST` al recurso. La
 * acción crea el borrador del periodo o REUTILIZA el que ya exista, recalcula
 * `saldo_libros` y reescribe `saldo_estado_cuenta` — por eso volver a
 * prepararlo es también la vía de corregir un saldo mal capturado.
 *
 * La respuesta 201 tiene forma PROPIA, distinta del serializer del listado (ver
 * `PrepararConciliacionResponse`), así que no se tipa como `ConciliacionBancaria`.
 *
 * LA IDEMPOTENCIA ES DE SERVICIO, NO DE BASE DE DATOS: no hay restricción
 * única, así que dos llamadas simultáneas del mismo periodo pueden crear dos
 * borradores. Quien la invoque debe impedir el doble envío (ver
 * `usePrepararConciliacionForm`).
 *
 * El error se deja propagar tal cual para que el hook lo reparta.
 */
export const prepararConciliacion = async (
  payload: PrepararConciliacionPayload,
): Promise<PrepararConciliacionResponse> => {
  const { data } = await v1_api.post<PrepararConciliacionResponse>(
    "/finanzas/conciliaciones-bancarias/preparar/",
    payload,
  );
  return data;
};

/**
 * Cierra una conciliación:
 * `POST /finanzas/conciliaciones-bancarias/{id}/cerrar/`.
 *
 * ES LA ÚNICA VÍA para dejarla en `Cerrada`. El servicio exige
 * `abs(diferencia) <= 0.01` y, solo entonces, marca `Conciliado` en bloque los
 * movimientos del periodo y cambia el estatus. Un `PATCH { estatus: "Cerrada" }`
 * conseguiría el mismo estatus SIN ninguna de esas dos cosas, así que este
 * módulo no hace ningún PATCH.
 *
 * Rechazos conocidos, ambos 400 con la forma `{"campo": ["mensaje"]}`:
 *  - `{"diferencia": [...]}` cuando el periodo no cuadra;
 *  - `{"estatus": [...]}` al intentar cerrar una cancelada.
 *
 * Es idempotente sobre una ya cerrada: responde 200 sin hacer nada.
 */
export const cerrarConciliacion = async (
  id: number,
): Promise<ConciliacionBancaria> => {
  const { data } = await v1_api.post<ConciliacionBancaria>(
    `/finanzas/conciliaciones-bancarias/${id}/cerrar/`,
  );
  return data;
};

/**
 * Cancela una conciliación:
 * `POST /finanzas/conciliaciones-bancarias/{id}/cancelar/`.
 *
 * Es un cambio de estatus y NADA MÁS: no revierte los movimientos que un cierre
 * hubiera marcado como `Conciliado`. Por eso la pantalla solo lo ofrece sobre un
 * `Borrador`, que por definición todavía no marcó nada. Idempotente.
 */
export const cancelarConciliacion = async (
  id: number,
): Promise<ConciliacionBancaria> => {
  const { data } = await v1_api.post<ConciliacionBancaria>(
    `/finanzas/conciliaciones-bancarias/${id}/cancelar/`,
  );
  return data;
};
