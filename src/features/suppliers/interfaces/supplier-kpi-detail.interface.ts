/**
 * Contrato de `GET /terceros/proveedores/{id}/kpis-detalle/?factor=…`
 * (EC-436, #859): los registros detrás de UN factor del scorecard de UN
 * proveedor, con los mismos criterios que `proveedores/kpis/`.
 *
 * - `factor` es obligatorio; acepta además `sucursal`, `fecha_desde` y
 *   `fecha_hasta`, pero el frontend no los manda: así las cifras cuadran con
 *   las tarjetas, que piden `kpis/` sin parámetros. Un parámetro desconocido
 *   responde 400.
 * - Sin paginación: como máximo `tope` (100) registros; `total` y `truncado`
 *   dicen si quedaron fuera.
 * - 404 si el proveedor no existe, está inactivo o es de otra empresa.
 * - Los decimales llegan como números JSON.
 */
export type SupplierKpiFactor = "puntualidad" | "calidad" | "cumplimiento" | "precio";

/**
 * Una recepción de OC del proveedor, a tiempo o no. Incluye las de OCs SIN
 * fecha prometida (`a_tiempo: null`), que no cuentan para el puntaje.
 * Orden del backend: la recepción más reciente primero.
 */
export interface SupplierKpiPunctualityRecord {
  recepcion_id: number;
  recepcion_folio: string;
  oc_id: number;
  oc_folio: string | null;
  /** Fecha LOCAL (America/Mexico_City) de la recepción, "YYYY-MM-DD". */
  fecha_recepcion: string | null;
  /** "YYYY-MM-DD"; `null` si la OC no tiene fecha de entrega estimada. */
  fecha_entrega_estimada: string | null;
  /** `null` sin fecha prometida: no se puede saber si llegó tarde. */
  a_tiempo: boolean | null;
}

/**
 * Un renglón de Calidad RECHAZADO (`resultado = rechazo`, cantidad > 0). Lo
 * aprobado no viene. Orden del backend: mayor cantidad rechazada primero.
 */
export interface SupplierKpiQualityRecord {
  id: number;
  recepcion_id: number;
  recepcion_folio: string;
  producto: string | null;
  cantidad_rechazada: number;
  motivo_rechazo: string | null;
}

/**
 * Una OC con faltante en UNA unidad de medida (recibido neto < ordenado). Lo
 * cumplido no viene. Orden del backend: peor cobertura primero.
 */
export interface SupplierKpiFulfillmentRecord {
  oc_id: number;
  folio: string | null;
  /** `null` = productos sin unidad capturada. */
  unidad_id: number | null;
  unidad: string | null;
  cantidad_ordenada: number;
  /** Recibido NETO: lo capturado menos lo rechazado por Calidad. */
  cantidad_recibida: number;
  pct: number;
}

/**
 * Una línea de factura Registrada cuyo precio difiere del pactado en la OC,
 * con factura y OC en la misma moneda. Orden del backend: la más reciente
 * primero. Sin permiso de contabilidad (`puede_ver_importes: false`) los dos
 * precios NO viajan (#859).
 */
export interface SupplierKpiPriceRecord {
  id: number;
  factura_id: number;
  factura_folio: string | null;
  oc_id: number;
  producto: string | null;
  moneda: string;
  /** Ausente sin permiso de contabilidad. */
  precio_facturado?: number;
  /** Ausente sin permiso de contabilidad. */
  precio_pactado?: number;
}

export interface SupplierKpiDetailRecordByFactor {
  puntualidad: SupplierKpiPunctualityRecord;
  calidad: SupplierKpiQualityRecord;
  cumplimiento: SupplierKpiFulfillmentRecord;
  precio: SupplierKpiPriceRecord;
}

export interface SupplierKpiDetail<F extends SupplierKpiFactor = SupplierKpiFactor> {
  proveedor_id: number;
  factor: F;
  /** Mismo criterio que `kpis/`; solo cambia lo que trae `factor=precio`. */
  puede_ver_importes: boolean;
  /** Registros ANTES del tope. */
  total: number;
  /** `true` si `registros` se cortó en `tope`. */
  truncado: boolean;
  tope: number;
  registros: SupplierKpiDetailRecordByFactor[F][];
}
