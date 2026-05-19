// ── Pasos canónicos del flujo de Pedido PQ ──────────────────────────────────
// Basado en el diagrama de flujo aprobado:
//   Generar pedido PQ (ligado a O.C.) → Ingresar cantidades → Verificar surtido
//   → ¿Pedido surtido? SI → Fin (surtido) | NO → Seguimiento logística
//   → Confirmar con proveedor → Proveedor utiliza insumos de O.C.
//   → Reintentar surtido → Contactar Almacén y Compras → (loop hasta surtido)

export const PQ_ORDER_STEPS = [
  'pedido_generado',       // 1 — Pedido PQ generado y ligado a la O.C. correspondiente
  'cantidades_ingresadas', // 2 — Cantidades ingresadas en el sistema
  'verificando_surtido',   // 3 — Verificando si el pedido puede ser surtido
  'en_seguimiento',        // 4 — Seguimiento de logística (pedido no surtido inmediatamente)
  'confirmando_proveedor', // 5 — Confirmando disponibilidad con el proveedor
  'proveedor_procesando',  // 6 — Proveedor utilizando insumos de la O.C. vinculada
  'contactando_almacen',   // 7 — Contactando almacén y compras para reintentar surtido
] as const;

/** Tipo de paso canónico */
export type PQOrderStep = (typeof PQ_ORDER_STEPS)[number];

/**
 * Unión completa de estatus posibles de un Pedido PQ.
 * Incluye los pasos canónicos más los estados terminales.
 */
export type PQOrderStatus =
  | PQOrderStep
  | 'surtido'   // Pedido surtido exitosamente; flujo cerrado
  | 'cancelado'; // Pedido cancelado en cualquier punto

// ── Etiquetas por estatus ────────────────────────────────────────────────────

export const PQ_ORDER_STATUS_LABELS: Record<PQOrderStatus, string> = {
  pedido_generado:       'Pedido Generado',
  cantidades_ingresadas: 'Cantidades Ingresadas',
  verificando_surtido:   'Verificando Surtido',
  en_seguimiento:        'En Seguimiento',
  confirmando_proveedor: 'Confirmando con Proveedor',
  proveedor_procesando:  'Proveedor Procesando',
  contactando_almacen:   'Contactando Almacén',
  surtido:               'Surtido',
  cancelado:             'Cancelado',
};

// ── Categoría de insumo ──────────────────────────────────────────────────────

export type CategoriaInsumo =
  | 'telas_insumos'
  | 'hilos_accesorios'
  | 'empaque'
  | 'bordados_serigrafia'
  | 'etiquetado'
  | 'otros_materiales';

export const CATEGORIA_INSUMO_LABELS: Record<CategoriaInsumo, string> = {
  telas_insumos:        'Telas e Insumos',
  hilos_accesorios:     'Hilos y Accesorios',
  empaque:              'Materiales de Empaque',
  bordados_serigrafia:  'Bordados y Serigrafía',
  etiquetado:           'Etiquetado y Acabados',
  otros_materiales:     'Otros Materiales',
};

// ── Evento de historial ──────────────────────────────────────────────────────

/** Un evento registrado en la trazabilidad del flujo de Pedido PQ */
export interface PQOrderEventRecord {
  /** Número de paso canónico (1-7) al que corresponde este evento */
  paso: number;
  /** Estatus registrado en este punto */
  estatus: PQOrderStatus;
  /** Fecha ISO en que ocurrió */
  fecha: string;
  /** Nombre del usuario responsable del evento */
  responsable: string;
  /** Notas del evento */
  notas: string;
}

// ── Entidad principal ────────────────────────────────────────────────────────

/** Pedido PQ — solicitud de surtido de insumos vinculada a una Orden de Compra */
export interface PQOrder {
  /** UUID único */
  id: string;
  /** Folio legible, ej: PQ-2025-001 */
  folio: string;
  /** Referencia de la Orden de Compra vinculada, ej: OC-2025-015 */
  oc_referencia: string;
  /** Nombre del proveedor */
  proveedor: string;
  /** RFC del proveedor */
  rfc_proveedor: string;
  /** Descripción del insumo solicitado */
  descripcion: string;
  /** Categoría del insumo */
  categoria: CategoriaInsumo;
  /** Cantidad total solicitada */
  cantidad_solicitada: number;
  /** Cantidad efectivamente surtida hasta el momento */
  cantidad_surtida: number;
  /** Unidad de medida (metros, kg, piezas, etc.) */
  unidad: string;
  /** Monto estimado de la compra (siempre en MXN) */
  monto_estimado: number;
  /** Responsable de compras que gestiona el pedido */
  responsable_compras: string;
  /** Fecha en que se generó el pedido */
  fecha_solicitud: string;
  /** Fecha estimada de entrega (null si cancelado) */
  fecha_estimada_entrega: string | null;
  /** Fecha real en que fue surtido (null si no completado) */
  fecha_surtido_real: string | null;
  /** Estatus actual del pedido */
  estatus: PQOrderStatus;
  /** Número de paso canónico activo (1-7) */
  paso_actual: number;
  /** Número de intentos de surtido realizados */
  intentos_surtido: number;
  /** Observaciones del pedido */
  observaciones: string;
  /** Historial de eventos en orden cronológico */
  historial: PQOrderEventRecord[];
}
