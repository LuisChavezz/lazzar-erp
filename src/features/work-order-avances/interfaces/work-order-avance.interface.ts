/**
 * Avance de una orden de trabajo de reflejante o corte de manga: solo piezas
 * (a diferencia del bordado, no hay puntadas). Contrato pedido al backend:
 *   POST   /produccion/reflejante-avances/     { orden_r, cantidad, comentario? }
 *   POST   /produccion/corte-manga-avances/    { ocm, cantidad, comentario? }
 *   DELETE /produccion/{reflejante|corte-manga}-avances/{id}/
 * y en el retrieve de la orden `avances` + `resumen_avance`.
 */
export interface WorkOrderAvance {
  id: number;
  fecha: string;
  cantidad: number;
  comentario: string | null;
  usuario?: number | null;
  usuario_nombre: string | null;
}

export interface WorkOrderResumenAvance {
  cantidad_programada: number;
  cantidad_realizada_total: number;
  porcentaje_avance: number;
}

/** Campos que el retrieve de la orden agrega. Opcionales hasta que el backend los mande. */
export interface WorkOrderAvanceFields {
  avances?: WorkOrderAvance[];
  resumen_avance?: WorkOrderResumenAvance;
}

/** Cómo se registra el avance de un tipo de orden. */
export interface WorkOrderAvanceConfig {
  /** Recurso REST, p. ej. `/produccion/reflejante-avances/`. */
  endpoint: string;
  /** Nombre del campo de la orden en el POST (`orden_r`, `ocm`). */
  orderField: string;
  /** Participio para la copia: "reflejadas", "cortadas". */
  verbo: string;
  /**
   * Listado de la orden: el backend cambia el estatus (y `fecha_fin`) al
   * guardar o borrar un avance, así que también se re-consulta.
   */
  listQueryKey: readonly unknown[];
}
