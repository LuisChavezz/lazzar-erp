/**
 * Contrato de `GET /finanzas/cuentas-por-pagar/` (`CuentaPorPagarSerializer`,
 * `fields = "__all__"` más cinco campos calculados de solo lectura). Nombres de
 * llaves EN ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Vive en `payments/` y no en un módulo propio a propósito: aquí solo se lee lo
 * que el selector de CxP del pago necesita. EC-133 construirá la pantalla de CxP
 * completa; cuando exista, este tipo debería mudarse ahí y `payments` importarlo,
 * igual que hace con `banks`.
 *
 * Como en el resto de finanzas: la respuesta es un ARREGLO PLANO (la app no
 * declara paginación), los decimales llegan como STRING ("1160.00") y las fechas
 * como "YYYY-MM-DD".
 */

/** Estatus de una cuenta por pagar, tal cual el enum del backend. */
export type CxPEstatus =
  | "Pendiente"
  | "Parcial"
  | "Pagada"
  | "Cancelada"
  | "Vencida";

/**
 * Estatus que dejan una CxP disponible para aplicarle un pago. `Pagada`,
 * `Cancelada` y `Vencida` quedan fuera de la selección: las dos primeras son
 * terminales y la tercera, pese a conservar saldo, es una condición que el
 * backend marca por su cuenta y que no se ofrece desde el alta de pagos.
 *
 * El filtro por estatus se resuelve EN CLIENTE: el `get_queryset` del backend
 * hace `qs.filter(estatus=estatus)` con un solo valor, así que no admite "Pendiente
 * O Parcial" en una sola llamada. Lo que sí se delega al servidor es
 * `saldo_pendiente=true` (`saldo__gt=0`), ver `getCuentasPorPagar`.
 */
export const CXP_ESTATUS_APLICABLES: readonly CxPEstatus[] = [
  "Pendiente",
  "Parcial",
];

export interface CuentaPorPagar {
  id: number;
  empresa: number;
  /** FK a `terceros.Proveedor`. */
  proveedor: number;
  /** FK a `finanzas.FacturaProveedor`. */
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
  fecha_vencimiento: string | null;
  /** Decimal en string. */
  total: string;
  /** Decimal en string. Es el TECHO de lo que puede aplicarse a esta CxP. */
  saldo: string;
  estatus: CxPEstatus;
  /** Calculado por el backend (`total − saldo`), decimal en string. */
  total_pagado: string;
  fecha_ultimo_pago: string | null;
  observaciones: string | null;
  created_at: string | null;
  /** `auto_now` sin `null=True` en el modelo. */
  updated_at: string;
}

/**
 * Parámetros del listado, espejo de `CuentaPorCobrarQueryParams` en CxC. El
 * `get_queryset` acepta `proveedor` (con alias `proveedor_id`), `estatus`,
 * `saldo_pendiente`, `vencidas`, `folio`, `moneda` y `factura_proveedor`; aquí
 * solo se declaran los que este módulo usa.
 */
export interface CuentaPorPagarQueryParams {
  proveedor?: number;
  estatus?: CxPEstatus;
  /** `true` → solo cuentas con `saldo > 0`. */
  saldo_pendiente?: boolean;
  /** `true` → solo cuentas vencidas con saldo pendiente. */
  vencidas?: boolean;
}
