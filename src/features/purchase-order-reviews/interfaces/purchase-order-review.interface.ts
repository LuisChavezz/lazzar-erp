// ── Pasos canónicos del flujo de revisión de pedidos ────────────────────────
// Representa el ciclo completo según el diagrama de flujo:
//   Solicitud → OC → OC enviada / Esperando confirmación proveedor
//   → Seguimiento logístico → Recepción y conteo
//   → Confirmación en sistema → Factura → CxP → Cierre

export const REVIEW_STEPS = [
  'solicitud_generada',     // 1 — Solicitud de compra directa o de stock
  'oc_creada',              // 2 — OC creada en el sistema
  'esperando_confirmacion', // 3 — OC enviada al proveedor; esperando confirmación de recepción
  'en_seguimiento',         // 4 — Proveedor confirmó; en seguimiento logístico
  'contando_registrando',   // 5 — Material recibido; contando y registrando contra factura
  'recepcion_confirmada',   // 6 — Recepción confirmada en sistema; folio R.T. generado
  'factura_subida',         // 7 — Factura subida según R.T.
  'cxp_revisado',           // 8 — Pagos CxP consultados y revisados
] as const;

/** Tipo de paso canónico */
export type ReviewStep = (typeof REVIEW_STEPS)[number];

/**
 * Unión completa de todos los posibles estatus de una revisión de pedido.
 * Los pasos canónicos más los estados especiales de final o bloqueo.
 */
export type ReviewStatus =
  | ReviewStep
  | 'completado'           // Flujo cerrado satisfactoriamente
  | 'no_recontactar'       // Proveedor no confirmó; sin recontacto
  | 'material_no_recibido' // Seguimiento confirma que el material no llegó
  | 'cancelado';           // Cancelado en cualquier punto del flujo

// ── Etiquetas legibles por estatus ──────────────────────────────────────────

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  solicitud_generada:     'Solicitud Generada',
  oc_creada:              'OC Creada',
  esperando_confirmacion: 'Esperando Confirmación',
  en_seguimiento:         'En Seguimiento Logístico',
  contando_registrando:   'Contando y Registrando',
  recepcion_confirmada:   'Recepción Confirmada',
  factura_subida:         'Factura Subida',
  cxp_revisado:           'CxP Revisado',
  completado:             'Completado',
  no_recontactar:         'No Recontactar',
  material_no_recibido:   'Material No Recibido',
  cancelado:              'Cancelado',
};

// ── Tipo de solicitud de compra ──────────────────────────────────────────────

export type TipoCompra = 'directa' | 'stock';

export const TIPO_COMPRA_LABELS: Record<TipoCompra, string> = {
  directa: 'Compra Directa',
  stock:   'Reposición de Stock',
};

// ── Evento de historial ──────────────────────────────────────────────────────

/** Un evento registrado en la trazabilidad del flujo de revisión */
export interface ReviewEventRecord {
  /** Número de paso canónico (1-9) al que corresponde este evento */
  paso: number;
  /** Estatus registrado en este punto */
  estatus: ReviewStatus;
  /** Fecha ISO en que ocurrió */
  fecha: string;
  /** Nombre del usuario responsable de este evento */
  responsable: string;
  /** Notas o comentarios del evento */
  notas: string;
}

// ── Entidad principal ────────────────────────────────────────────────────────

/** Revisión de pedido de compra — entidad principal del módulo */
export interface PurchaseOrderReview {
  /** UUID único de la revisión */
  id: string;
  /** Folio legible, ej: REV-2025-001 */
  folio: string;
  /** Referencia de la OC relacionada, ej: OC-2025-045 */
  oc_referencia: string;
  /** Tipo de compra que originó esta revisión */
  tipo_compra: TipoCompra;
  /** Nombre del proveedor */
  proveedor: string;
  /** RFC del proveedor */
  rfc_proveedor: string;
  /** Categoría del material o producto comprado */
  categoria: string;
  /** Descripción breve de la compra */
  descripcion: string;
  /** Fecha de creación de la solicitud */
  fecha_solicitud: string;
  /** Fecha estimada de entrega pactada con el proveedor */
  fecha_estimada_entrega: string;
  /** Fecha real de recepción del material (null si no ha llegado) */
  fecha_recepcion_real: string | null;
  /** Monto total de la OC (siempre en MXN) */
  monto_total: number;
  /** Estatus actual dentro del flujo */
  estatus: ReviewStatus;
  /** Número de paso canónico activo (1-8) */
  paso_actual: number;
  /** Nombre del responsable en compras */
  responsable_compras: string;
  /** Nombre del responsable en almacén */
  responsable_almacen: string;
  /** Nombre del responsable en CxP */
  responsable_cxp: string;
  /** Número de folio de la recepción en almacén (R.T.), disponible a partir del paso 7 */
  folio_rt: string | null;
  /** Indica si se aplicó una nota de crédito o devolución */
  tiene_nota_credito: boolean;
  /** Monto de la nota de crédito (null si no aplica) */
  nota_credito_monto: number | null;
  /** Observaciones generales */
  observaciones: string;
  /** Historial de eventos en orden cronológico */
  historial: ReviewEventRecord[];
}
