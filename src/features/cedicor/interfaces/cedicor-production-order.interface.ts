// ── Pasos canónicos del flujo de órdenes de producción (resurtido / stock) ───

export const PRODUCTION_ORDER_STEPS = [
  'orden_generada',           // 1 — Producción genera la orden de corte y la OP
  'op_enviada_correo',        // 2 — Producción envía la OP por correo
  'ficha_tecnica_generada',   // 3 — Ingeniería de producto genera ficha técnica
  'verificacion_materiales',  // 4 — Almacén verifica y traspasa materiales
  'entregado_a_trazo',        // 5 — Almacén entrega a trazo (solo si tela completa)
  'trazo_a_corte',            // 6 — Trazo envía a corte
  'corte_completado',         // 7 — Corte realiza el corte y devuelve a almacén
  'consumo_capturado',        // 8 — Almacén captura consumo de tela
  'despachado_confeccion',    // 9 — Almacén junta habilitación y despacha a confección
] as const;

export type ProductionOrderStatus =
  | (typeof PRODUCTION_ORDER_STEPS)[number]
  | 'material_faltante'
  | 'cancelado';

export type MaterialVerificationStatus =
  | 'sin_verificar'
  | 'disponible'
  | 'faltante'
  | 'parcial';

/** Etiquetas legibles para cada estatus de la orden de producción */
export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  orden_generada:          'Orden Generada',
  op_enviada_correo:       'OP Enviada',
  ficha_tecnica_generada:  'Ficha Técnica',
  verificacion_materiales: 'Verificando Materiales',
  entregado_a_trazo:       'En Trazo',
  trazo_a_corte:           'En Corte',
  corte_completado:        'Corte Completado',
  consumo_capturado:       'Consumo Capturado',
  despachado_confeccion:   'Despachado a Confección',
  material_faltante:       'Material Faltante',
  cancelado:               'Cancelado',
};

// ── Interfaces de datos ───────────────────────────────────────────────────────

/** Evento del historial de una orden de producción */
export interface ProductionOrderEventRecord {
  /** Número de paso canónico (1-9) */
  paso: number;
  /** Estatus registrado en este evento */
  estatus: ProductionOrderStatus;
  /** Fecha ISO en que ocurrió el evento */
  fecha: string;
  /** Nombre del responsable que ejecutó el paso */
  responsable: string;
  /** Notas adicionales del evento */
  notas: string;
}

/** Orden de producción para artículos de resurtido o stock */
export interface ProductionOrder {
  id: string;
  /** Folio único, e.g. "OP-2025-001" */
  folio: string;
  /** Fecha de creación en ISO */
  fecha_creacion: string;
  /** Fecha estimada de entrega o null si no aplica */
  fecha_estimada_entrega: string | null;
  cliente: string;
  nombre_producto: string;
  /** SKU del producto existente */
  clave_producto: string;
  descripcion: string;
  temporada: string;
  clave_estilo: string;
  colores: string[];
  tallas: string[];
  cantidad_total: number;
  estatus: ProductionOrderStatus;
  /** Número de paso activo (1-9) */
  paso_actual: number;
  responsable_actual: string;
  /** Responsable del área de producción */
  responsable_produccion: string;
  /** Responsable de ingeniería de producto */
  responsable_ing_producto: string;
  /** Responsable del almacén */
  responsable_almacen: string;
  /** Responsable del área de trazo */
  responsable_trazo: string;
  /** Responsable del área de corte */
  responsable_corte: string;
  /** Indica si la ficha técnica ya fue generada */
  tiene_ficha_tecnica: boolean;
  /** Estado de verificación de materiales en almacén */
  verificacion_materiales: MaterialVerificationStatus;
  observaciones: string;
  historial: ProductionOrderEventRecord[];
}
