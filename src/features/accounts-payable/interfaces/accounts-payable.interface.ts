/**
 * Contrato de `/finanzas/cuentas-por-pagar/` (`CuentaPorPagarSerializer`,
 * `fields = "__all__"` más cinco campos calculados de solo lectura). Nombres de
 * llaves EN ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Como en el resto de finanzas: la respuesta es un ARREGLO PLANO (la app no
 * declara paginación), los decimales llegan como STRING ("1160.00") y las fechas
 * como "YYYY-MM-DD".
 *
 * Listado y detalle (`GET /{id}/`) usan el MISMO serializer, así que un renglón
 * del listado ya es el documento completo: la vista de detalle no necesita pedir
 * nada más. Solo el alta usa otra clase (`CuentaPorPagarCreateSerializer`), que
 * vuelve de solo lectura `saldo` y `estatus` (ver `CreateCuentaPorPagarPayload`).
 *
 * Mudado desde `payments/interfaces/cuenta-por-pagar.interface.ts` (EC-133):
 * `payments` lo importa de aquí, igual que hace con `banks`.
 */

/**
 * Estatus de una cuenta por pagar, tal cual el enum del backend
 * (`CuentaPorPagar.EstatusCxP`).
 *
 * NO incluye `Vencida`: no es un estado persistido. El `estatus` solo sigue al
 * saldo, así que una cuenta vencida se sigue leyendo `Pendiente` o `Parcial`; lo
 * vencido se DERIVA de `fecha_vencimiento` y `saldo` (en el servidor, con
 * `?vencidas=true`). En esta app es una marca de la vista, nunca un valor de
 * este tipo.
 */
export type CxPEstatus = "Pendiente" | "Parcial" | "Pagada" | "Cancelada";

export interface CuentaPorPagar {
  id: number;
  /** FK a `nucleo.Empresa`. La resuelve el backend; el cliente la LEE, nunca la envía. */
  empresa: number;
  /** FK a `terceros.Proveedor`. */
  proveedor: number;
  /** FK a `finanzas.FacturaProveedor`. Una factura origina UNA sola CxP. */
  factura_proveedor: number;
  /** Calculado (`source="proveedor.nombre"`), solo lectura. */
  proveedor_nombre: string | null;
  /** Calculado (`source="factura_proveedor.folio"`), solo lectura. */
  factura_proveedor_folio: string | null;
  /** Calculado (`source="factura_proveedor.moneda_id"`), solo lectura. */
  moneda_id: number | null;
  /** Calculado (`source="factura_proveedor.moneda.codigo_iso"`), solo lectura. */
  moneda_codigo: string | null;
  /** Fecha "YYYY-MM-DD". `auto_now_add` en el modelo, así que nunca es nula. */
  fecha_emision: string;
  /** Fecha "YYYY-MM-DD", o `null` si la cuenta no tiene vencimiento. */
  fecha_vencimiento: string | null;
  /** Decimal en string. */
  total: string;
  /** Decimal en string. Es el TECHO de lo que puede aplicarse a esta CxP. */
  saldo: string;
  estatus: CxPEstatus;
  /** Calculado por el backend (`total − saldo`), decimal en string. */
  total_pagado: string;
  /** Fecha "YYYY-MM-DD" del último pago, o `null` si aún no hay pagos. */
  fecha_ultimo_pago: string | null;
  observaciones: string | null;
  created_at: string | null;
  /** `auto_now` sin `null=True` en el modelo. */
  updated_at: string;
}

/**
 * Orden del listado. El backend solo acepta los campos de su orden por defecto
 * (`-fecha_emision,-id`); cualquier otro valor se ignora en silencio y se aplica
 * ese default.
 */
export type CuentaPorPagarOrdering =
  | "fecha_emision"
  | "-fecha_emision"
  | "id"
  | "-id";

/**
 * Parámetros de `GET /finanzas/cuentas-por-pagar/`, todos opcionales —Axios
 * omite las llaves `undefined`—. Se declara el nombre canónico de cada filtro;
 * el `get_queryset` acepta además los alias `proveedor_id`, `moneda_id`,
 * `factura_proveedor_id`, `fecha_inicio` y `fecha_fin`, que no se repiten aquí
 * para no tener dos llaves con el mismo efecto.
 */
export interface CuentaPorPagarQueryParams {
  proveedor?: number;
  /** Un solo valor: el backend no admite "Pendiente O Parcial" en una llamada. */
  estatus?: CxPEstatus;
  /** `true` → solo cuentas con `saldo > 0`. */
  saldo_pendiente?: boolean;
  /**
   * `true` → solo cuentas vencidas: `fecha_vencimiento` NO nula y ANTERIOR a hoy
   * (estricto: la que vence hoy aún no cuenta), `saldo > 0` y estatus distinto de
   * `Cancelada`. Es la única forma de pedir lo vencido al servidor: no existe
   * `estatus=Vencida`.
   */
  vencidas?: boolean;
  /** Búsqueda parcial (`icontains`) sobre el folio de la FACTURA de proveedor. */
  folio?: string;
  /** FK a la moneda de la factura de proveedor. */
  moneda?: number;
  factura_proveedor?: number;
  /** Límite inferior INCLUSIVO de `fecha_emision`, "YYYY-MM-DD". */
  fecha_desde?: string;
  /** Límite superior INCLUSIVO de `fecha_emision`, "YYYY-MM-DD". */
  fecha_hasta?: string;
  ordering?: CuentaPorPagarOrdering;
}

/**
 * Cuerpo de `POST /finanzas/cuentas-por-pagar/` (alta manual).
 *
 * Tipo SEPARADO del de lectura a propósito: es la costura entre los valores del
 * formulario y lo que viaja al API (ver `utils/buildCuentaPorPagarPayload.ts`).
 *
 *  - `proveedor` y `total` DEBEN coincidir con los de la factura elegida: el
 *    serializer los cruza y responde 400 en la llave `proveedor` o `total`. En
 *    esta UI se derivan de la factura, así que coinciden por construcción.
 *  - NO lleva `saldo` ni `estatus`: son de solo lectura en el alta y la cuenta
 *    nace con `saldo = total` y `Pendiente`. Mandarlos sugeriría que el cliente
 *    controla valores que el backend descarta.
 *  - NO lleva `empresa` (la resuelve el servidor) ni `fecha_emision`
 *    (`auto_now_add`) ni `fecha_ultimo_pago` (la mueven los pagos).
 *  - `fecha_vencimiento` es OPCIONAL y, cuando viaja, es una fecha real. Si la
 *    llave se omite —o llega `null`— el backend copia la de la factura. Por eso
 *    se OMITE en vez de mandar `null`: un `null` se leería como "sin
 *    vencimiento", y no es lo que ocurre.
 */
export interface CreateCuentaPorPagarPayload {
  proveedor: number;
  factura_proveedor: number;
  /** Decimal en string; debe ser igual a `total` de la factura de proveedor. */
  total: string;
  fecha_vencimiento?: string;
  observaciones: string | null;
}
