import type {
  ConciliacionEnDetalle,
  PrepararConciliacionResponse,
} from "../interfaces/bank-reconciliation.interface";

/**
 * Normaliza la respuesta de `preparar` a lo que lee el diálogo de detalle.
 *
 * Existe para poder abrir el detalle del borrador recién preparado SIN esperar a
 * que su fila aparezca en el listado: cuando el periodo preparado es distinto
 * del que la vista muestra, el filtro de la URL cambia de forma asíncrona y,
 * durante ese intervalo, el listado sigue siendo el del filtro anterior —ahí la
 * fila nueva no está—.
 *
 * Solo resuelve la forma, no inventa datos:
 *  - `cuenta_bancaria` llega ANIDADA (`{id, alias, banco}`); se aplana al id y
 *    el alias pasa a `cuenta_bancaria_alias`, que es como lo trae el listado.
 *  - `observaciones` NO viaja en `preparar`, así que se deja sin definir (ver
 *    `ConciliacionEnDetalle`) en vez de fingir un `null`.
 *  - `movimientos_pendientes`, `total_abonos_rango` y `total_cargos_rango` se
 *    descartan: el detalle es solo cabecera (las líneas son una fase 2).
 */
export const conciliacionEnDetalleDesdePreparar = (
  resultado: PrepararConciliacionResponse,
): ConciliacionEnDetalle => ({
  id: resultado.id,
  cuenta_bancaria: resultado.cuenta_bancaria.id,
  cuenta_bancaria_alias: resultado.cuenta_bancaria.alias,
  fecha_inicio: resultado.fecha_inicio,
  fecha_final: resultado.fecha_final,
  saldo_estado_cuenta: resultado.saldo_estado_cuenta,
  saldo_libros: resultado.saldo_libros,
  estatus: resultado.estatus,
});

/**
 * Llave del filtro de la vista para una cuenta y un periodo. Es la MISMA forma
 * con que la vista describe el filtro que lee de la URL, para poder saber si el
 * listado cargado ya corresponde a ese periodo.
 */
export const llaveDeFiltro = (
  cuentaBancaria: number,
  fechaInicio: string | null,
  fechaFinal: string | null,
): string => `${cuentaBancaria}|${fechaInicio ?? ""}|${fechaFinal ?? ""}`;
