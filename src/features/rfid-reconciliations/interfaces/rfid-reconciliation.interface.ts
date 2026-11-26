// ── Encuadre RFID de recepción ────────────────────────────────────────────────
// `/compras/recepcion-rfid-encuadres/` (nucleo-erp#1353 y #1442, EC-961): conteo
// de etiquetas leídas contra una OC u OP ANTES de la recepción formal. Aceptarlo
// solo valida el conteo: no crea `Recepcion` ni mueve inventario.
//
// Formas de `RecepcionRFIDEncuadreSerializer` (detalle, alta, aceptar y
// cancelar) y `RecepcionRFIDEncuadreListSerializer` (fila del listado: la misma
// sin `lecturas[]` ni `resumen`, con sus totales planos). Los decimales viajan
// como texto.

/** `RecepcionRFIDEncuadre.Estatus`: se crea PENDIENTE; ACEPTADO y CANCELADO no vuelven. */
export type RfidReconciliationEstatus = "PENDIENTE" | "ACEPTADO" | "CANCELADO";

/** Origen del encuadre: una OC o una OP (nunca una SM). */
export type RfidReconciliationTipoOrigen = "OC" | "OP";

/** Una etiqueta leída. Se resuelve por SKU de variante o código de producto. */
export interface RfidReconciliationRead {
  id: number;
  codigo_tag: string;
  /** Renglón de la OC al que sumó; `null` si no se resolvió o es de OP. */
  orden_compra_detalle: number | null;
  /** Renglón de la OP al que sumó; `null` si no se resolvió o es de OC. */
  orden_produccion_detalle: number | null;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  /** "Producto - Color - Talla" de la variante. */
  producto_variante_nombre: string | null;
  /** Siempre "1.0000" hoy: una etiqueta es una pieza. */
  cantidad_leida: string;
  /** `resolved` dice si el código encontró producto. */
  metadata: { resolved?: boolean; tokens?: string[]; source?: string } & Record<string, unknown>;
  created_at: string;
}

/** Renglón de la OC/OP con lo esperado (ordenado − ya recibido) contra lo leído. */
export interface RfidReconciliationSummaryLine {
  detalle_id: number;
  producto_id: number | null;
  producto_nombre: string | null;
  producto_variante_id: number | null;
  producto_variante_sku: string | null;
  producto_variante_talla: string | null;
  ordenado: string;
  ya_recibido: string;
  esperado: string;
  leido: string;
  /** esperado − leído: negativo si se leyó de más. */
  diferencia: string;
}

/** Totales del encuadre, con los mismos nombres en el `resumen` y en la fila del listado. */
export interface RfidReconciliationTotals {
  total_esperado: string;
  /** Todas las lecturas, también las que no se resolvieron. */
  total_leido: string;
  /** Lecturas que no cayeron en ningún renglón de la orden. */
  total_sin_asignar: string;
  /** esperado > 0 y leído ≥ esperado. Solo informativo: aceptar no lo exige. */
  completo: boolean;
}

export interface RfidReconciliationSummary extends RfidReconciliationTotals {
  detalle: RfidReconciliationSummaryLine[];
}

/** Campos comunes del listado y del detalle. */
export interface RfidReconciliationBase {
  id: number;
  tipo_origen: RfidReconciliationTipoOrigen;
  orden_compra: number | null;
  /** `null` si el encuadre es de OP (o la OC no tiene folio). */
  orden_compra_folio: string | null;
  op: number | null;
  op_folio: string | null;
  /** Siempre `null` hoy: nada lo escribe (nucleo-erp#1441). */
  recepcion: number | null;
  empresa: number;
  sucursal: number;
  proveedor: number | null;
  proveedor_nombre: string | null;
  almacen: number;
  almacen_nombre: string | null;
  /** Solo el id de quien lo creó: el backend no manda su nombre (nucleo-erp#1440). */
  usuario: number;
  serie_codigo: string;
  /** Cuándo se creó el encuadre (el backend la fija al dar de alta). */
  fecha_recepcion: string | null;
  remision: string | null;
  factura_referencia: string | null;
  observaciones: string | null;
  estatus: RfidReconciliationEstatus;
  estatus_label: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  aceptado_por: number | null;
  aceptado_por_nombre: string | null;
  fecha_aceptacion: string | null;
  /** `""` mientras no se cancele. */
  motivo_cancelacion: string;
  fecha_cancelacion: string | null;
  cancelado_por: number | null;
  cancelado_por_nombre: string | null;
}

/** Fila de `GET .../` (EC-981). */
export type RfidReconciliationRow = RfidReconciliationBase & RfidReconciliationTotals;

/** `GET .../{id}/`, y la respuesta de alta, `aceptar/` y `cancelar/`. */
export interface RfidReconciliation extends RfidReconciliationBase {
  lecturas: RfidReconciliationRead[];
  resumen: RfidReconciliationSummary;
}

/** Cuerpo de `POST .../`: `orden_compra` u `op`, nunca los dos. */
export interface CreateRfidReconciliationPayload {
  tipo_origen: RfidReconciliationTipoOrigen;
  orden_compra?: number;
  op?: number;
  almacen: number;
  serie_codigo?: string;
  remision?: string;
  factura_referencia?: string;
  observaciones?: string;
}
