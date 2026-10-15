/**
 * Un destino posible del estatus de una OP, tal como lo calcula el backend
 * (`GET /produccion/orden-produccion/{op_id}/estatus/`). La lista solo trae
 * destinos válidos desde el estatus actual, nunca el actual; para una OP
 * Completada o Cancelada viene vacía.
 */
export interface ProductionOrderStatusOption {
  estatus_op: number;
  /** Etiqueta del backend (sin acentos); la UI usa la local y esta de respaldo. */
  etiqueta: string;
  /** Detenido y Cancelado: el POST exige `motivo`. */
  requiere_motivo: boolean;
  /** `false` cuando faltan requisitos de la ruta crítica (`bloqueos`). */
  permitido: boolean;
  /** Requisitos que faltan, ya redactados por el backend. */
  bloqueos: string[];
  /** Solo `true` con bloqueos y usuario superuser o admin de empresa. */
  se_puede_forzar: boolean;
}

/** Respuesta del GET `estatus/`. */
export interface ProductionOrderStatusInfo {
  op_id: number;
  folio_op: string;
  estatus_op: number;
  estatus_op_display: string;
  opciones: ProductionOrderStatusOption[];
}

/**
 * Cuerpo del POST `estatus/`. `motivo` es obligatorio para Detenido (6) y
 * Cancelado (7); `forzar` solo cuenta cuando es exactamente `true`, así que se
 * omite en vez de mandarse en `false`.
 */
export interface ChangeProductionOrderStatusBody {
  estatus_op: number;
  motivo?: string;
  forzar?: true;
}

/** Respuesta 200 del POST. No trae `opciones`: hay que volver a pedir el GET. */
export interface ChangeProductionOrderStatusResponse {
  msg: string;
  op_id: number;
  estatus_op: number;
  estatus_op_display: string;
  fecha_fin: string | null;
}
