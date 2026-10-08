/**
 * `GET /produccion/orden-produccion/kpis/`: indicadores de órdenes de
 * producción que CALCULA el backend en cada lectura. Aquí no se recalcula
 * nada; la UI pinta los valores tal cual.
 *
 * Cada bloque es una unión discriminada sobre `disponible`: CUALQUIERA de los
 * cuatro puede llegar como `{ disponible: false, motivo }` (p. ej. un usuario
 * sin empresa recibe los cuatro así, con `filtros: null`). La UI decide solo
 * por esa bandera, nunca por el nombre del bloque.
 */

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface ProductionOrderKpiUnavailable {
  disponible: false;
  motivo: string;
}

/**
 * Semáforo del cumplimiento, tal como lo decide el backend contra `meta`.
 * `sin_datos` llega con `pct: null` cuando no hay OPs terminadas.
 */
export type ProductionOrderKpiSemaforo = "verde" | "amarillo" | "rojo" | "sin_datos";

/** OP terminada después de su fecha estimada de entrega. */
export interface ProductionOrderKpiLateOp {
  op_id: number;
  folio_op: string;
  /** Datetime UTC ("...Z"): se muestra en hora local. */
  fecha_fin: string;
  /** Fecha-calendario "YYYY-MM-DD"; `null` si la OP no tiene una. */
  fecha_entrega_estimada: string | null;
}

export interface ProductionOrderOnTimeAvailable {
  disponible: true;
  /** 0–100 con 1 decimal; `null` junto con `semaforo: "sin_datos"`. */
  pct: number | null;
  meta: number;
  semaforo: ProductionOrderKpiSemaforo;
  /** Todas las OPs en estatus Completado, tengan o no fechas. */
  ops_terminadas: number;
  /** Completadas con `fecha_fin` y `fecha_entrega_estimada`, a tiempo. */
  ops_a_tiempo: number;
  /**
   * OPs tardías, como MÁXIMO 20 y sin paginación. El total de tardías NO es
   * `ops_terminadas - ops_a_tiempo`: una completada sin alguna de las dos
   * fechas cuenta como terminada pero no es ni a tiempo ni tardía, y el backend
   * no expone ese total.
   */
  drill_down_tardias: ProductionOrderKpiLateOp[];
}

/** OP abierta cuya fecha estimada de entrega ya pasó. */
export interface ProductionOrderKpiOverdueOp {
  op_id: number;
  folio_op: string;
  /** Fecha-calendario "YYYY-MM-DD". */
  fecha_entrega_estimada: string;
  dias_vencida: number;
}

export interface ProductionOrderOverdueAvailable {
  disponible: true;
  total: number;
  /** Aclaración del backend sobre qué cuenta el indicador. */
  nota: string;
  /** Como MÁXIMO 20 filas y sin paginación; el total real es `total`. */
  drill_down: ProductionOrderKpiOverdueOp[];
}

/**
 * Avance de producción y eficiencia de línea: hoy SIEMPRE llegan no
 * disponibles (el esquema no guarda piezas terminadas, SAM, operadores ni
 * minutos). Su forma disponible aún no existe en el contrato, así que no se
 * tipa ningún campo: solo la bandera.
 */
export interface ProductionOrderKpiPendingContract {
  disponible: true;
}

export type ProductionOrderOnTimeKpi = ProductionOrderOnTimeAvailable | ProductionOrderKpiUnavailable;
export type ProductionOrderOverdueKpi = ProductionOrderOverdueAvailable | ProductionOrderKpiUnavailable;
export type ProductionOrderUntypedKpi = ProductionOrderKpiPendingContract | ProductionOrderKpiUnavailable;

export interface ProductionOrderKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  /** `null` para un usuario sin empresa. */
  filtros: { meta_otd: number } | null;
  cumplimiento_a_tiempo: ProductionOrderOnTimeKpi;
  avance_produccion: ProductionOrderUntypedKpi;
  eficiencia_linea: ProductionOrderUntypedKpi;
  ops_atrasadas: ProductionOrderOverdueKpi;
}
