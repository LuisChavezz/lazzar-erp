/**
 * Contrato de `GET /terceros/proveedores/kpis/` (EC-436): un ranking POR
 * PROVEEDOR, no un bloque por indicador. Las tarjetas se agregan en el frontend
 * a partir de los conteos de cada fila (`utils/supplierKpis.ts`).
 *
 * - Solo trae proveedores ACTIVOS con actividad, ordenados por
 *   `scorecard.puntaje` descendente (nulos al final, luego por nombre), con
 *   tope de `filtros.limite` filas (50 por defecto), sin paginación:
 *   `total_proveedores` y `truncado` dicen si quedaron fuera.
 * - Las cantidades llegan como números JSON.
 * - `disponible` solo existe a nivel raíz: un usuario sin empresa recibe
 *   `{ disponible: false, motivo, proveedores: [] }`. Los bloques de cada
 *   proveedor no traen `disponible`; un dato que no se puede calcular llega en
 *   `null`.
 * - Sin parámetros enviados (acepta `proveedor`, `sucursal`, `fecha_desde`,
 *   `fecha_hasta`, `meta_scorecard` y `limite`): todo el histórico.
 */

export type SupplierKpiSemaforo = "verde" | "amarillo" | "rojo" | "sin_datos";

/** Ordenado vs. recibido neto de UNA unidad de medida. */
export interface SupplierKpiUnitFulfillment {
  unidad_id: number | null;
  /** Clave de la unidad; `null` = productos sin unidad capturada. */
  unidad: string | null;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  pct: number | null;
}

/**
 * Costo facturado vs. pactado de UNA moneda. Sin permiso de contabilidad el
 * backend quita los dos importes y deja `moneda` y `pct` (#859). La UI no
 * muestra ninguno de los dos importes.
 */
export interface SupplierKpiPriceCurrency {
  moneda: string;
  /** Ausente sin permiso de contabilidad. */
  costo_facturado?: number;
  /** Ausente sin permiso de contabilidad. */
  costo_pactado_oc?: number;
  pct: number | null;
}

export interface SupplierKpiRow {
  proveedor_id: number;
  proveedor_nombre: string;
  entrega_a_tiempo: {
    /**
     * `recepciones_a_tiempo / recepciones_con_compromiso`; `null` sin
     * recepciones con fecha prometida (no se puede saber si llegaron tarde).
     */
    pct: number | null;
    recepciones_a_tiempo: number;
    /** Todas las recepciones de OC del proveedor, con o sin fecha prometida. */
    recepciones_total: number;
    /** Recepciones cuya OC tiene `fecha_entrega_estimada`: el denominador de `pct`. */
    recepciones_con_compromiso: number;
  };
  calidad: {
    /** `null` sin cantidad inspeccionada. */
    pct_rechazado: number | null;
    /** El backend suma cantidades de unidades de medida distintas. */
    cantidad_rechazada: number;
    cantidad_inspeccionada: number;
  };
  lead_time: {
    /** Promedio por recepción sobre `recepciones_medidas`; `null` si es 0. */
    dias_promedio_real: number | null;
    /** Sobre las MISMAS recepciones que el real; `null` si es 0. */
    dias_promedio_pactado: number | null;
    /** Recepciones con fecha prometida (y fecha de OC) sobre las que se promedian ambos. */
    recepciones_medidas: number;
  };
  cumplimiento_cantidad: {
    /** `null` con unidades mezcladas (ver `por_unidad`) o sin nada ordenado. */
    pct: number | null;
    mezcla_unidades: boolean;
    /** `null` con unidades mezcladas. */
    cantidad_ordenada: number | null;
    cantidad_recibida: number | null;
    por_unidad: SupplierKpiUnitFulfillment[];
  };
  /**
   * `pct` es porcentaje, no importe: llega con o sin permiso, y solo cuando hay
   * una sola moneda. Los importes de `por_moneda` faltan sin permiso.
   */
  diferencia_precio: {
    pct: number | null;
    por_moneda: SupplierKpiPriceCurrency[];
  };
  /**
   * Promedio simple de los factores con dato (puntualidad, calidad,
   * cumplimiento y precio). El factor de precio entra por su `pct`, no por
   * importes: llega con o sin permiso. La UI cuenta semáforos.
   */
  scorecard: {
    puntaje: number | null;
    /** Contra `filtros.meta_scorecard` (80 por defecto). */
    semaforo: SupplierKpiSemaforo;
  };
}

export interface SupplierKpiFilters {
  sucursal: number | null;
  proveedor: number | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  meta_scorecard: number;
  limite: number;
}

interface SupplierKpisEnvelope {
  /** Datetime ISO. */
  generado_en: string;
  proveedores: SupplierKpiRow[];
  /** Proveedores con actividad ANTES del tope de `limite`. */
  total_proveedores: number;
  /** `true` si `proveedores` se cortó en `filtros.limite`. */
  truncado: boolean;
}

export interface SupplierKpisAvailable extends SupplierKpisEnvelope {
  disponible: true;
  filtros: SupplierKpiFilters;
  /** Con `false`, `diferencia_precio.por_moneda[]` llega sin importes (#859). */
  puede_ver_importes: boolean;
}

/** Usuario sin empresa: `proveedores: []` y el motivo para el usuario. */
export interface SupplierKpisUnavailable extends SupplierKpisEnvelope {
  disponible: false;
  motivo: string;
  filtros: null;
  /** Siempre `false` sin empresa (#860). */
  puede_ver_importes: false;
}

export type SupplierKpis = SupplierKpisAvailable | SupplierKpisUnavailable;
