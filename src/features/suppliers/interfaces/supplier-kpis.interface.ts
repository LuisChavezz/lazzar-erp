/**
 * Contrato de `GET /terceros/proveedores/kpis/` (EC-436): un ranking POR
 * PROVEEDOR, no un bloque por indicador, y sin `disponible`/`motivo`. Las
 * tarjetas se agregan en el frontend a partir de los conteos de cada fila
 * (`utils/supplierKpis.ts`).
 *
 * - Solo trae proveedores con actividad, ordenados por `scorecard.puntaje`
 *   descendente (nulos al final) y con tope de 50 filas, sin paginación.
 * - Las cantidades llegan como números JSON.
 * - Un usuario sin empresa recibe `proveedores: []`.
 * - Sin parámetros: todo el histórico.
 */

export type SupplierKpiSemaforo = "verde" | "amarillo" | "rojo" | "sin_datos";

export interface SupplierKpiRow {
  proveedor_id: number;
  proveedor_nombre: string;
  entrega_a_tiempo: {
    /** `null` sin recepciones. */
    pct: number | null;
    recepciones_a_tiempo: number;
    /** Las mismas recepciones sobre las que se promedia `lead_time.dias_promedio_real`. */
    recepciones_total: number;
  };
  calidad: {
    /** `null` sin cantidad inspeccionada. */
    pct_rechazado: number | null;
    cantidad_rechazada: number;
    cantidad_inspeccionada: number;
  };
  lead_time: {
    dias_promedio_real: number | null;
    /** Hoy siempre `null`: ninguna OC tiene `fecha_entrega_estimada` (backend #388). */
    dias_promedio_pactado: number | null;
  };
  cumplimiento_cantidad: {
    pct: number | null;
    cantidad_ordenada: number;
    cantidad_recibida: number;
  };
  /**
   * Derivado de precios: llega aunque el usuario no pueda ver contabilidad
   * (backend #377). La UI no lo muestra.
   */
  diferencia_precio: {
    pct: number | null;
  };
  /** Incluye el factor de precio (ver `diferencia_precio`). La UI no muestra `puntaje`. */
  scorecard: {
    puntaje: number | null;
    semaforo: SupplierKpiSemaforo;
  };
}

export interface SupplierKpis {
  /** Datetime ISO. */
  generado_en: string;
  proveedores: SupplierKpiRow[];
}
