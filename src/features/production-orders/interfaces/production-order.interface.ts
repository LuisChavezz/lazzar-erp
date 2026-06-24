// ── Pasos canónicos del flujo de órdenes de producción ────────────────────────
// Corresponden al diagrama de flujo:
//   1. Creada → 2. Verificando materiales → ¿Hay faltantes?
//     SÍ → comprando_materiales (ruta alterna) → 3. En fabricación
//     NO →                                       3. En fabricación
//   → 4. Registrando avance → 5. Cierre solicitado → 6. Cerrada

export const PRODUCTION_ORDER_STEPS = [
  'creada',                  // 1 — OP registrada en el sistema
  'verificando_materiales',  // 2 — Almacén verifica disponibilidad de materiales
  'en_fabricacion',          // 3 — Fabricación iniciada (previo abastecer si hubo faltantes)
  'registrando_avance',      // 4 — Registrando avance de producción y consumos
  'cierre_solicitado',       // 5 — Se solicitó el cierre formal de la OP
  'cerrada',                 // 6 — OP cerrada y completada
] as const;

export type ProductionOrderStatus =
  | (typeof PRODUCTION_ORDER_STEPS)[number]
  | 'comprando_materiales'  // ruta alterna: comprando materiales faltantes detectados
  | 'material_faltante'     // bloqueada: faltantes detectados, aún sin orden de compra
  | 'cancelada';

/** Etiquetas legibles para cada estatus de la orden de producción */
export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  creada:                  'Creada',
  verificando_materiales:  'Verificando Materiales',
  en_fabricacion:          'En Fabricación',
  registrando_avance:      'Registrando Avance',
  cierre_solicitado:       'Cierre Solicitado',
  cerrada:                 'Completa',
  comprando_materiales:    'Comprando Materiales',
  material_faltante:       'Material Faltante',
  cancelada:               'Cancelada',
};

export type ProductionOrderPriority = 'alta' | 'media' | 'baja';

/** Etiquetas legibles para la prioridad */
export const PRODUCTION_ORDER_PRIORITY_LABELS: Record<ProductionOrderPriority, string> = {
  alta:  'Alta',
  media: 'Media',
  baja:  'Baja',
};

// ── Interfaces de datos ───────────────────────────────────────────────────────

/** Evento registrado en el historial de una orden de producción */
export interface ProductionOrderEventRecord {
  /** Número de paso canónico (1-6); 2.5 para el evento de comprando_materiales */
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

// ── Onboarding ───────────────────────────────────────────────────────────────

export interface ProductionOrderOnboardingTalla {
  talla: string;
  color: string;
  cantidad: number;
}

export interface ProductionOrderOnboardingCantidades {
  total: number;
  tallas: ProductionOrderOnboardingTalla[];
}

export interface ProductionOrderOnboardingHabilitacion {
  codigo: string;
  descripcion: string;
  unidad: string;
  total: number;
}

export interface ProductionOrderOnboardingProducto {
  nombre: string;
  cantidades: ProductionOrderOnboardingCantidades;
  habilitacion: ProductionOrderOnboardingHabilitacion[];
}

export interface ProductionOrderOnboarding {
  op_id: number;
  folio_op: string;
  estatus_op: number;
  prioridad: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  observaciones: string;
  activo: boolean;
  empresa: number;
  sucursal: number;
  pedido: number | null;
  ruta_produccion: number | null;
  usuario_asignado: number;
  op_info: string;
  productos: ProductionOrderOnboardingProducto[];
}

/** Orden de producción genérica */
export interface ProductionOrder {
  id: string;
  /** Folio único, e.g. "OP-2025-001" */
  folio: string;
  /** Fecha de creación en ISO */
  fecha_creacion: string;
  /** Fecha estimada de entrega o null para canceladas */
  fecha_estimada_entrega: string | null;
  /** Nombre del producto a fabricar */
  nombre_producto: string;
  /** Clave / SKU del producto */
  clave_producto: string;
  /** Descripción breve del producto */
  descripcion: string;
  /** Área de producción responsable */
  area: string;
  /** Cantidad total de piezas/unidades a producir */
  cantidad_total: number;
  /** Unidad de medida (PZA, KG, MT, etc.) */
  unidad_medida: string;
  /** Prioridad de la orden */
  prioridad: ProductionOrderPriority;
  /** Estatus actual de la orden */
  estatus: ProductionOrderStatus;
  /** Posición en el flujo canónico (1-6) */
  paso_actual: number;
  /** Indica si la orden transitó por la ruta de compra de materiales faltantes */
  tuvo_faltantes: boolean;
  /** Responsable del área de producción / planificación */
  responsable_produccion: string;
  /** Responsable del almacén */
  responsable_almacen: string;
  /** Responsable de compras (aplica cuando tuvo_faltantes = true) */
  responsable_compras: string;
  /** Responsable activo según el paso en curso */
  responsable_actual: string;
  /** Observaciones generales de la orden */
  observaciones: string;
  /** Historial cronológico de eventos del flujo */
  historial: ProductionOrderEventRecord[];
}
