/**
 * Contrato de `/finanzas/conciliaciones-bancarias/`
 * (`ConciliacionBancariaSerializer`, con `fields = "__all__"` más dos campos de
 * solo lectura: `diferencia` y `cuenta_bancaria_alias`). Los nombres de las
 * llaves se conservan EN ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Igual que el resto de finanzas: la respuesta del listado es un ARREGLO PLANO
 * —la app `finanzas` no declara paginación—, los decimales llegan como STRING y
 * las fechas como "YYYY-MM-DD".
 *
 * Listado y detalle comparten serializer, así que el diálogo de detalle se arma
 * con la fila que el listado ya tiene y no hace una consulta propia.
 *
 * ─── LAS LÍNEAS NO SE EXPONEN AQUÍ ───────────────────────────────────────────
 *
 * `ConciliacionDetalle` (los movimientos que la conciliación tomó) existe en el
 * backend pero NO viaja ni en el listado ni en el detalle. La única respuesta
 * que los trae es la de `preparar` (ver `PrepararConciliacionResponse`), y esta
 * fase no los muestra: el desglose queda para una fase 2.
 */

import type { ConciliacionEstatus } from "../constants/conciliacionEstatus";

export type { ConciliacionEstatus };

export interface ConciliacionBancaria {
  id: number;
  /** FK a `finanzas.CuentaBancaria`. En el LISTADO es un id, no un objeto. */
  cuenta_bancaria: number;
  /** Calculado (`source="cuenta_bancaria.alias"`), solo lectura. Nullable. */
  cuenta_bancaria_alias: string | null;
  /** Fecha "YYYY-MM-DD". Nullable en el modelo. */
  fecha_inicio: string | null;
  /**
   * Fecha "YYYY-MM-DD". Nullable en el modelo: sin ella, el backend toma el
   * saldo VIVO de la cuenta como saldo de libros en vez de reconstruirlo a una
   * fecha de corte.
   */
  fecha_final: string | null;
  /** Decimal en string. Lo captura el cliente al preparar. */
  saldo_estado_cuenta: string;
  /**
   * Decimal en string. Lo CALCULA el servidor al preparar, reconstruyendo el
   * saldo de la cuenta al cierre de `fecha_final`. El cliente nunca lo envía.
   */
  saldo_libros: string;
  /**
   * `saldo_estado_cuenta - saldo_libros`, ya redondeado a 2 decimales y
   * serializado como string.
   *
   * Esta pantalla NO lo usa para juzgar el cuadre: lo recalcula en CENTAVOS
   * ENTEROS con la misma tolerancia que aplica el backend al cerrar (ver
   * `conciliacionCuadra`), igual que hace el formulario de pólizas. Así lo que
   * se pinta y lo que el backend aceptará no pueden discrepar por un redondeo
   * de coma flotante.
   */
  diferencia: string;
  estatus: ConciliacionEstatus;
  observaciones: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Lo que el diálogo de detalle necesita para pintarse — y nada más.
 *
 * Existe porque el detalle se abre desde DOS fuentes con formas distintas: la
 * fila del listado (`ConciliacionBancaria`) y, justo después de preparar, la
 * respuesta de `preparar` (`PrepararConciliacionResponse`), que anida la cuenta
 * y no trae `observaciones`. En vez de forzar una forma sobre la otra, el diálogo
 * declara solo los campos que lee; una fila del listado ya los cumple tal cual y
 * la respuesta de `preparar` se normaliza a esto (ver
 * `conciliacionEnDetalleDesdePreparar`).
 *
 * `observaciones` es OPCIONAL: `preparar` no la devuelve, así que recién
 * preparada se desconoce —no es lo mismo que "vacía"— hasta que la fila llega
 * al listado y la sustituye.
 */
export type ConciliacionEnDetalle = Pick<
  ConciliacionBancaria,
  | "id"
  | "cuenta_bancaria"
  | "cuenta_bancaria_alias"
  | "fecha_inicio"
  | "fecha_final"
  | "saldo_estado_cuenta"
  | "saldo_libros"
  | "estatus"
> & {
  observaciones?: string | null;
};

/**
 * Cuerpo de `POST /finanzas/conciliaciones-bancarias/preparar/`.
 *
 * `preparar` es el ÚNICO camino de alta de esta pantalla: no se hace un POST
 * normal al recurso. Crea el borrador del periodo o REUTILIZA el que ya exista
 * —solo un `Borrador`; una cerrada o cancelada no se toca—, recalcula
 * `saldo_libros` y REESCRIBE `saldo_estado_cuenta` con el valor que se envíe.
 * Esa reescritura es la vía de corrección de un saldo mal capturado.
 *
 * `fecha_inicio` y `fecha_final` son opcionales para el backend; esta pantalla
 * las exige (ver `PrepararConciliacionFormSchema`).
 */
export interface PrepararConciliacionPayload {
  cuenta_bancaria: number;
  fecha_inicio: string;
  fecha_final: string;
  saldo_estado_cuenta: string;
}

/**
 * Renglón de `movimientos_pendientes` en la respuesta de `preparar`.
 *
 * Se declara para que el tipo de la respuesta sea fiel, pero esta fase NO lo
 * consume: el desglose de movimientos conciliados es una fase 2 y el listado y
 * el detalle no lo traen, así que mostrarlo solo tras preparar daría una
 * pantalla que enseña las líneas una vez y nunca más.
 */
export interface MovimientoPendienteConciliacion {
  id: number;
  fecha: string;
  concepto: string | null;
  referencia: string | null;
  tipo_movimiento: string;
  importe: string;
  estatus: string;
  origen: string | null;
  cobro_id: number | null;
  pago_id: number | null;
}

/**
 * Respuesta 201 de `preparar`. Es un dict armado a mano por el servicio, NO el
 * `ConciliacionBancariaSerializer`, y su forma difiere en dos puntos que
 * importan:
 *
 *  - `cuenta_bancaria` es un OBJETO ANIDADO (`{id, alias, banco}`), no el id
 *    plano del listado.
 *  - Trae `total_abonos_rango`, `total_cargos_rango` y `movimientos_pendientes`,
 *    que ningún otro endpoint devuelve.
 *
 * Por eso tiene tipo propio y no se reusa `ConciliacionBancaria`. De aquí solo
 * se consume `id`: el detalle se arma con la fila del listado ya refrescado,
 * para que la pantalla tenga una sola fuente de verdad.
 */
export interface PrepararConciliacionResponse {
  id: number;
  cuenta_bancaria: {
    id: number;
    alias: string | null;
    banco: string | null;
  };
  fecha_inicio: string | null;
  fecha_final: string | null;
  saldo_estado_cuenta: string;
  saldo_libros: string;
  diferencia: string;
  total_abonos_rango: string;
  total_cargos_rango: string;
  estatus: ConciliacionEstatus;
  movimientos_pendientes: MovimientoPendienteConciliacion[];
}

/**
 * Parámetros de `GET /finanzas/conciliaciones-bancarias/`.
 *
 * ─── EL RANGO FILTRA POR SOLAPAMIENTO ────────────────────────────────────────
 *
 * El `get_queryset` aplica `fecha_final__gte=<inicio>` y
 * `fecha_inicio__lte=<fin>`: devuelve las conciliaciones cuyo periodo SE SOLAPA
 * con el rango pedido, no las que caen dentro de él. Es justo la consulta que
 * necesita la comprobación previa a preparar (ver `usePrepararConciliacionForm`).
 *
 * OJO con los nombres: el extremo inicial es `fecha_inicio` (alias
 * `fecha_desde`) y el final es **`fecha_fin`** (alias `fecha_hasta`) —NO
 * `fecha_final`, que es el nombre del CAMPO del modelo, no el del parámetro—.
 *
 * LÍMITE CONOCIDO: una conciliación con `fecha_final` en `null` nunca entra en
 * el filtro (la comparación con `NULL` es falsa en SQL), así que la
 * comprobación previa no la vería. Esta pantalla siempre manda las dos fechas
 * al preparar, de modo que no puede crear una así.
 */
export interface ConciliacionBancariaQueryParams {
  cuenta_bancaria?: number;
  estatus?: ConciliacionEstatus;
  /** Extremo inicial del rango de solapamiento. */
  fecha_inicio?: string;
  /** Extremo final del rango de solapamiento. NO se llama `fecha_final`. */
  fecha_fin?: string;
  ordering?: string;
}
