// ── Onboarding de Calidad ─────────────────────────────────────────────────────
// Forma de GET /compras/calidad-inspecciones/onboarding/ tal como la arma
// `CalidadInspeccionViewSet.handle_get_onboarding` (nucleo-erp,
// compras/api/views.py). No es un serializer: es un dict construido a mano, así
// que no aparece como componente en el OpenAPI.
//
// El backend devuelve como MÁXIMO 50 recepciones pendientes (`[:50]`), las más
// recientes primero (`-fecha_recepcion`), y 200 inspectores.

/** Renglón de una recepción pendiente. `id` es el PK de `RecepcionDetalle`. */
export interface QualityPendingReceptionLine {
  id: number;
  producto_id: number;
  producto_nombre: string;
  /** Decimal en string con 4 posiciones ("1000.0000"). */
  cantidad_recibida: string;
}

export interface QualityPendingReception {
  id: number;
  folio: string;
  tipo_origen: "OC" | "OP";
  /** `null` en recepciones de OP (no tienen proveedor). */
  proveedor_nombre: string | null;
  /** Solo el id: el nombre llega en el detalle de la recepción. */
  almacen_id: number;
  fecha_recepcion: string;
  detalle: QualityPendingReceptionLine[];
  /** Folio de la SM, OC u OP contra la que se recibió (nucleo-erp #1272). */
  origen_folio?: string | null;
  almacen_nombre?: string | null;
  /** Pedido maestro principal; `null` si el origen no está ligado a un pedido. */
  pedido_id?: number | null;
  pedido_folio?: string | null;
  /** Todos los pedidos, el principal primero (una OC consolidada trae varios). */
  pedidos?: QualityPedidoRef[];
}

export interface QualityPedidoRef {
  id: number;
  folio: string | null;
}

/**
 * `hr.Empleado` activo de la empresa. `Usuario` y `Empleado` no están ligados
 * en el backend, así que el inspector se elige a mano: NO es el usuario en
 * sesión.
 */
export interface QualityInspector {
  id: number;
  numero_empleado: string | null;
  nombre: string;
  apellido_paterno: string | null;
}

export interface QualityInspectionOnboardingData {
  empresa_id: number | null;
  recepciones_pendientes: QualityPendingReception[];
  inspectores: QualityInspector[];
}

// ── Alta de la inspección ─────────────────────────────────────────────────────

/**
 * `CalidadInspeccionDetalle.RESULTADO_CHOICES`. `"concesion lazzar"` lleva un
 * ESPACIO (no guion bajo): es el valor real que acepta el backend.
 */
export type QualityResultado =
  | "liberado"
  | "cuarentena"
  | "concesion_cc"
  | "concesion lazzar"
  | "rechazo";

export interface CreateQualityInspectionLine {
  recepcion_detalle: number;
  /** Decimal de 2 posiciones ("900.00"). */
  cantidad_aprobada: string;
  cantidad_rechazada: string;
  resultado: QualityResultado;
  motivo_rechazo: string | null;
}

/**
 * Cuerpo de POST /compras/calidad-inspecciones/onboarding/. Debe incluir TODOS
 * los renglones de la recepción en un solo envío. `fecha` se omite a propósito:
 * el backend toma la fecha del día.
 */
export interface CreateQualityInspectionPayload {
  recepcion: number;
  inspector: number;
  observaciones?: string;
  detalle: CreateQualityInspectionLine[];
}

export interface QualityInspectionDetalle {
  id: number;
  recepcion_detalle: number;
  producto_nombre: string;
  cantidad_inspeccionada: string;
  cantidad_aprobada: string;
  cantidad_rechazada: string;
  resultado: QualityResultado;
  motivo_rechazo: string | null;
}

export interface QualityInspection {
  id: number;
  recepcion: number;
  recepcion_folio: string;
  inspector: number;
  inspector_nombre: string | null;
  fecha: string;
  /**
   * `anulada` (EC-947): un admin revirtió la inspección
   * (`calidad-inspecciones/{id}/revertir/`); lo que liberó salió del almacén y
   * la recepción volvió a En calidad.
   */
  estado: "pendiente" | "aprobada" | "rechazada" | "aprobada_condicion" | "anulada";
  estado_label: string;
  observaciones: string | null;
  detalles: QualityInspectionDetalle[];
  /**
   * Datos de la reversa (nucleo-erp#1353), solo lectura. `""`/`null` en una
   * inspección no anulada; opcionales por si un backend anterior no los manda.
   * `anulada_por` es solo el id del usuario (sin nombre): no se muestra.
   */
  motivo_anulacion?: string;
  fecha_anulacion?: string | null;
  anulada_por?: number | null;
  pedido_id?: number | null;
  pedido_folio?: string | null;
  pedidos?: QualityPedidoRef[];
  /**
   * Algo rechazado o en cuarentena aún sin devolver al proveedor (nucleo-erp#1413,
   * la regla de `devoluciones-proveedor/pendientes/`); una anulada, `false`. En
   * listado y detalle; opcional por si un backend anterior no lo manda.
   */
  tiene_devolucion_pendiente?: boolean;
}

/**
 * Respuesta 200 del POST. `movimiento_id` es el id de un `AuditoriaEvento` (no
 * de un movimiento de inventario). Ambos ids son `null` cuando nada se aprobó.
 */
export interface CreateQualityInspectionResponse {
  calidad_inspeccion: QualityInspection;
  movimiento_id: number | null;
  movimiento_inventario_id: number | null;
}

/**
 * Respuesta 200 de `POST calidad-inspecciones/{id}/revertir/` (EC-947): la
 * inspección ya anulada, el estatus al que volvió la recepción (4, En calidad)
 * y el de su OC (`null` si la recepción es de una OP). `movimiento_id` es el
 * `AuditoriaEvento` de la SALIDA y `movimiento_inventario_id` la SALIDA misma;
 * ambos `null` si la inspección no había metido nada al almacén.
 */
export interface RevertQualityInspectionResponse {
  calidad_inspeccion: QualityInspection;
  recepcion_estatus: number;
  orden_compra_estatus: number | null;
  movimiento_id: number | null;
  movimiento_inventario_id: number | null;
}
