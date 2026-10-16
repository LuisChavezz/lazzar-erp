/**
 * `GET /compras/recepciones/kpis/` (EC-434): indicadores de recepciones de
 * compra que CALCULA el backend en cada lectura. Aquí no se recalcula nada; la
 * UI pinta los valores tal cual.
 *
 * Sin parámetros enviados (acepta `sucursal`, `proveedor`, `fecha_desde` y
 * `fecha_hasta`, que esta pantalla no usa), todo el histórico, sin metas ni
 * semáforo. Cada bloque es una unión discriminada sobre `disponible`:
 * CUALQUIERA de los cuatro puede llegar como `{ disponible: false, motivo }`
 * (p. ej. un usuario sin empresa recibe los cuatro así).
 *
 * `pct`: 0–100 con 1 decimal, `null` cuando el denominador es 0. Cantidades e
 * importes son NÚMEROS JSON. Nada se suma entre unidades de medida ni entre
 * monedas: el backend agrupa por unidad (`por_unidad`) y por moneda
 * (`por_moneda`, código ISO, catálogo abierto).
 *
 * Sin permiso de contabilidad el backend devuelve `diferencia_precio` como
 * `{ disponible: false, motivo }`, y en `material_rechazado` quita `por_moneda`
 * y el `valor_linea` de cada fila (por eso son opcionales).
 *
 * Los drill-downs traen como MÁXIMO 20 filas, sin paginación;
 * `drill_down_total` y `drill_down_truncado` dicen cuántas hay en total.
 */

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface PurchaseOrderReceiptKpiUnavailable {
  disponible: false;
  motivo: string;
}

/** Totales de drill-down que trae cada bloque con lista. */
interface PurchaseOrderReceiptKpiDrillDownTotals {
  drill_down_total: number;
  /** `true` si el backend cortó `drill_down` (hay más filas que las listadas). */
  drill_down_truncado: boolean;
}

/** Ordenado vs. recibido neto de UNA unidad de medida. */
export interface PurchaseOrderReceiptKpiUnitFulfillment {
  unidad_id: number | null;
  /** Clave de la unidad ("PZA", "MTS"); `null` = productos sin unidad capturada. */
  unidad: string | null;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  pct: number | null;
}

/** OC y unidad con algo pendiente: recibido neto menor que lo ordenado. */
export interface PurchaseOrderReceiptKpiFulfillmentRow {
  oc_id: number;
  folio: string | null;
  unidad_id: number | null;
  unidad: string | null;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  pct: number | null;
}

export interface PurchaseOrderReceiptFulfillmentKpiAvailable extends PurchaseOrderReceiptKpiDrillDownTotals {
  disponible: true;
  /** `true` con más de una unidad de medida: entonces los totales y `pct` son `null`. */
  mezcla_unidades: boolean;
  cantidad_ordenada: number | null;
  /** Recibido NETO: lo rechazado por Calidad no cuenta. */
  cantidad_recibida: number | null;
  pct: number | null;
  /** Una fila por unidad de medida (sin unidad al final). */
  por_unidad: PurchaseOrderReceiptKpiUnitFulfillment[];
  /** Una fila por (OC, unidad), peor cobertura primero. */
  drill_down: PurchaseOrderReceiptKpiFulfillmentRow[];
}

export interface PurchaseOrderReceiptPartialKpiAvailable {
  disponible: true;
  ocs_parciales: number;
  ocs_recibidas_o_parciales: number;
  pct: number | null;
}

/** Diferencia de precio de UNA moneda (la de la factura, igual a la de su OC). */
export interface PurchaseOrderReceiptKpiPriceCurrency {
  moneda: string;
  lineas_evaluadas: number;
  costo_facturado: number;
  costo_pactado_oc: number;
  /** Con signo: positivo = se facturó por encima de lo pactado. */
  diferencia: number;
  /** `null` si lo pactado es 0 (nada contra qué comparar). */
  pct: number | null;
}

/** Partida de factura de proveedor cuyo precio difiere del pactado en la OC. */
export interface PurchaseOrderReceiptKpiPriceRow {
  id: number;
  factura_id: number;
  factura_folio: string | null;
  producto: string | null;
  moneda: string;
  precio_facturado: number;
  precio_pactado: number;
  /** (precio facturado − pactado) × cantidad, con signo. */
  diferencia_linea: number;
}

export interface PurchaseOrderReceiptPriceKpiAvailable extends PurchaseOrderReceiptKpiDrillDownTotals {
  disponible: true;
  /** Líneas comparadas, de todas las monedas; 0 = no hubo nada que evaluar. */
  lineas_evaluadas: number;
  /**
   * Líneas cuya factura está en una moneda distinta a la de su OC: no se
   * comparan, así que no entran en `por_moneda` ni en el drill-down.
   */
  lineas_moneda_distinta: number;
  por_moneda: PurchaseOrderReceiptKpiPriceCurrency[];
  drill_down: PurchaseOrderReceiptKpiPriceRow[];
}

/** Cantidad rechazada de UNA unidad de medida. */
export interface PurchaseOrderReceiptKpiUnitRejected {
  unidad_id: number | null;
  unidad: string | null;
  cantidad_rechazada: number;
}

/** Valor rechazado (a precio pactado en la OC) de UNA moneda, la de la OC. */
export interface PurchaseOrderReceiptKpiRejectedCurrency {
  moneda: string;
  valor_rechazado: number;
}

/** Renglón rechazado por Calidad en una recepción de OC. */
export interface PurchaseOrderReceiptKpiRejectedRow {
  id: number;
  recepcion_id: number;
  recepcion_folio: string | null;
  producto: string | null;
  unidad: string | null;
  moneda: string;
  cantidad_rechazada: number;
  /** Ausente sin permiso de contabilidad. */
  valor_linea?: number;
  motivo_rechazo: string | null;
}

export interface PurchaseOrderReceiptRejectedKpiAvailable extends PurchaseOrderReceiptKpiDrillDownTotals {
  disponible: true;
  /** `true` con más de una unidad de medida: entonces `cantidad_rechazada` es `null`. */
  mezcla_unidades: boolean;
  cantidad_rechazada: number | null;
  por_unidad: PurchaseOrderReceiptKpiUnitRejected[];
  /** Ausente sin permiso de contabilidad. */
  por_moneda?: PurchaseOrderReceiptKpiRejectedCurrency[];
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
  /** Filtros aplicados (sobre la OC); `null` para un usuario sin empresa. */
  filtros: {
    sucursal: number | null;
    proveedor: number | null;
    fecha_desde: string | null;
    fecha_hasta: string | null;
  } | null;
  cumplimiento_cantidad: PurchaseOrderReceiptFulfillmentKpi;
  recepciones_parciales: PurchaseOrderReceiptPartialKpi;
  diferencia_precio: PurchaseOrderReceiptPriceKpi;
  material_rechazado: PurchaseOrderReceiptRejectedKpi;
}
