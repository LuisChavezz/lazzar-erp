// ── Pasos canónicos del flujo de solicitud de compra de gastos ───────────────
// Basado en el diagrama de flujo aprobado:
//   Revisar requerimiento → Contactar proveedor → Solicitar cotización
//   → Revisión (Cobranza / Gerencia) → ¿Validado?
//     SI → Pedido emitido → Seguimiento logístico → Recibir compra
//          → Firmar factura → Registrar R.G. en PROSCAI → Integrar documentos → FIN
//     NO → Fin: cancelar solicitud

export const EXPENSE_REQUEST_STEPS = [
  'revision_requerimiento', // 1 — Revisar el requerimiento de gasto
  'contactando_proveedor',  // 2 — Contactar proveedor por correo o teléfono
  'cotizacion_solicitada',  // 3 — Cotización solicitada y recibida del proveedor
  'en_revision',            // 4 — Enviado a Cobranza / Gerencia para validación
  'pedido_emitido',         // 5 — Solicitud aprobada; pedido emitido al proveedor
  'en_seguimiento',         // 6 — Seguimiento logístico de la entrega
  'compra_recibida',        // 7 — Compra recibida en almacén o área solicitante
  'factura_firmada',        // 8 — Factura firmada y verificada
  'rg_registrado',          // 9 — R.G. registrado en PROSCAI; documentos reunidos
  'documentos_integrados',  // 10 — R.G. y factura integrados; listos para Cobranza
] as const;

/** Tipo de paso canónico */
export type ExpenseRequestStep = (typeof EXPENSE_REQUEST_STEPS)[number];

/**
 * Unión completa de todos los posibles estatus de una solicitud de gasto.
 * Los pasos canónicos más los estados especiales de bloqueo o cierre.
 */
export type ExpenseRequestStatus =
  | ExpenseRequestStep
  | 'completado'  // Enviado a Cobranza; flujo cerrado satisfactoriamente
  | 'rechazado'   // Rechazado en validación (desde en_revision)
  | 'cancelado';  // Cancelado en cualquier punto del flujo

// ── Etiquetas legibles por estatus ──────────────────────────────────────────

export const EXPENSE_REQUEST_STATUS_LABELS: Record<ExpenseRequestStatus, string> = {
  revision_requerimiento: 'Revisando Requerimiento',
  contactando_proveedor:  'Contactando Proveedor',
  cotizacion_solicitada:  'Cotización Solicitada',
  en_revision:            'En Revisión',
  pedido_emitido:         'Pedido Emitido',
  en_seguimiento:         'En Seguimiento',
  compra_recibida:        'Compra Recibida',
  factura_firmada:        'Factura Firmada',
  rg_registrado:          'R.G. Registrado',
  documentos_integrados:  'Documentos Integrados',
  completado:             'Completado',
  rechazado:              'Rechazado',
  cancelado:              'Cancelado',
};

// ── Tipo de gasto ────────────────────────────────────────────────────────────

export type TipoGasto =
  | 'papeleria'
  | 'material_oficina'
  | 'limpieza'
  | 'mantenimiento'
  | 'servicios_profesionales'
  | 'transportacion'
  | 'hospedaje_viaticos'
  | 'suscripciones'
  | 'seguridad'
  | 'cafeteria'
  | 'otros';

export const TIPO_GASTO_LABELS: Record<TipoGasto, string> = {
  papeleria:               'Papelería',
  material_oficina:        'Material de Oficina',
  limpieza:                'Limpieza',
  mantenimiento:           'Mantenimiento',
  servicios_profesionales: 'Servicios Profesionales',
  transportacion:          'Transportación',
  hospedaje_viaticos:      'Hospedaje / Viáticos',
  suscripciones:           'Suscripciones',
  seguridad:               'Seguridad',
  cafeteria:               'Cafetería',
  otros:                   'Otros',
};

// ── Evento de historial ──────────────────────────────────────────────────────

/** Un evento registrado en la trazabilidad del flujo de solicitud de gasto */
export interface ExpenseRequestEventRecord {
  /** Número de paso canónico (1-10) al que corresponde este evento */
  paso: number;
  /** Estatus registrado en este punto */
  estatus: ExpenseRequestStatus;
  /** Fecha ISO en que ocurrió */
  fecha: string;
  /** Nombre del usuario responsable de este evento */
  responsable: string;
  /** Notas o comentarios del evento */
  notas: string;
}

// ── Entidad principal ────────────────────────────────────────────────────────

/** Solicitud de compra de gastos — entidad principal del módulo */
export interface ExpensePurchaseRequest {
  /** UUID único de la solicitud */
  id: string;
  /** Folio legible, ej: SGE-2025-001 */
  folio: string;
  /** Nombre del empleado que genera la solicitud */
  solicitante: string;
  /** Área o departamento que solicita el gasto */
  area: string;
  /** Categoría del gasto */
  tipo_gasto: TipoGasto;
  /** Nombre del proveedor */
  proveedor: string;
  /** RFC del proveedor */
  rfc_proveedor: string;
  /** Descripción del bien o servicio a comprar */
  descripcion: string;
  /** Justificación del gasto */
  justificacion: string;
  /** Monto total de la solicitud (siempre en MXN) */
  monto: number;
  /** Fecha en que se generó la solicitud */
  fecha_solicitud: string;
  /** Fecha estimada de pago o entrega (null si fue rechazada o cancelada) */
  fecha_estimada_pago: string | null;
  /** Fecha real en que se recibió la compra (null si no ha llegado) */
  fecha_recepcion_real: string | null;
  /** Estatus actual dentro del flujo */
  estatus: ExpenseRequestStatus;
  /** Número de paso canónico activo (1-10) */
  paso_actual: number;
  /** Nombre de quien aprobó la solicitud en revisión (null hasta paso 5) */
  aprobado_por: string | null;
  /** Motivo de rechazo (null si no fue rechazada) */
  motivo_rechazo: string | null;
  /** Folio R.G. registrado en PROSCAI (disponible desde paso 9) */
  folio_rg: string | null;
  /** Observaciones generales */
  observaciones: string;
  /** Historial de eventos en orden cronológico */
  historial: ExpenseRequestEventRecord[];
}
