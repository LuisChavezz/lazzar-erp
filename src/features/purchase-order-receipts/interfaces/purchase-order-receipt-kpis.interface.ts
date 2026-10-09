/**
 * `GET /compras/recepciones/kpis/` (EC-434): indicadores de recepciones de
 * compra que CALCULA el backend en cada lectura. Aquí no se recalcula nada; la
 * UI pinta los valores tal cual.
 *
 * Sin parámetros (cualquiera se ignora), todo el histórico, sin metas ni
 * semáforo. Cada bloque es una unión discriminada sobre `disponible`:
 * CUALQUIERA de los cuatro puede llegar como `{ disponible: false, motivo }`
 * (p. ej. un usuario sin empresa recibe los cuatro así).
 *
 * `pct`: 0–100 con 1 decimal, `null` cuando el denominador es 0. Cantidades e
 * importes son NÚMEROS JSON; los importes no traen moneda. Van OPCIONALES
 * porque, una vez que el backend aplique el filtro de contabilidad (hoy los
 * devuelve a cualquier usuario), se espera que la clave NO llegue a quien no
 * tiene `puede_ver_contabilidad`. Los drill-downs traen como MÁXIMO 20 filas,
 * sin paginación ni indicador de recorte.
 */

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface PurchaseOrderReceiptKpiUnavailable {
  disponible: false;
  motivo: string;
}

/** OC con su cantidad ordenada vs recibida. */
export interface PurchaseOrderReceiptKpiFulfillmentRow {
  oc_id: number;
  folio: string | null;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  pct: number | null;
}

export interface PurchaseOrderReceiptFulfillmentKpiAvailable {
  disponible: true;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  pct: number | null;
  drill_down: PurchaseOrderReceiptKpiFulfillmentRow[];
}

export interface PurchaseOrderReceiptPartialKpiAvailable {
  disponible: true;
  ocs_parciales: number;
  ocs_recibidas_o_parciales: number;
  pct: number | null;
}

/** Partida de factura de proveedor cuyo precio difiere del pactado en la OC. */
export interface PurchaseOrderReceiptKpiPriceRow {
  id: number;
  factura_proveedor__folio: string | null;
  oc_detalle__producto__nombre: string;
  precio_unitario?: number;
  oc_detalle__precio?: number;
  diferencia_linea?: number;
}

export interface PurchaseOrderReceiptPriceKpiAvailable {
  disponible: true;
  costo_facturado?: number;
  costo_pactado_oc?: number;
  /** Con signo: positivo = se facturó por encima de lo pactado. */
  diferencia?: number;
  pct: number | null;
  drill_down: PurchaseOrderReceiptKpiPriceRow[];
}

/** Renglón rechazado en la inspección de calidad de una recepción. */
export interface PurchaseOrderReceiptKpiRejectedRow {
  id: number;
  recepcion_detalle__recepcion__folio: string | null;
  recepcion_detalle__producto__nombre: string;
  cantidad_rechazada: number;
  /** `null` en recepciones de producción (sin precio de OC). */
  valor_linea?: number | null;
  motivo_rechazo: string | null;
}

export interface PurchaseOrderReceiptRejectedKpiAvailable {
  disponible: true;
  cantidad_rechazada: number;
  valor_rechazado?: number;
  drill_down: PurchaseOrderReceiptKpiRejectedRow[];
}

export type PurchaseOrderReceiptFulfillmentKpi =
  | PurchaseOrderReceiptFulfillmentKpiAvailable
  | PurchaseOrderReceiptKpiUnavailable;
export type PurchaseOrderReceiptPartialKpi =
  | PurchaseOrderReceiptPartialKpiAvailable
  | PurchaseOrderReceiptKpiUnavailable;
export type PurchaseOrderReceiptPriceKpi =
  | PurchaseOrderReceiptPriceKpiAvailable
  | PurchaseOrderReceiptKpiUnavailable;
export type PurchaseOrderReceiptRejectedKpi =
  | PurchaseOrderReceiptRejectedKpiAvailable
  | PurchaseOrderReceiptKpiUnavailable;

export interface PurchaseOrderReceiptKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  cumplimiento_cantidad: PurchaseOrderReceiptFulfillmentKpi;
  recepciones_parciales: PurchaseOrderReceiptPartialKpi;
  diferencia_precio: PurchaseOrderReceiptPriceKpi;
  material_rechazado: PurchaseOrderReceiptRejectedKpi;
}
