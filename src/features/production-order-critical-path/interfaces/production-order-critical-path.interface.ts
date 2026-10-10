import type { EstatusPaqueteTecnico } from "../constants/criticalPathChoices";

/**
 * Ruta crítica de una orden de producción —
 * `GET|PATCH /produccion/orden-produccion/{op_id}/ruta-critica/`.
 *
 * Un registro por OP, pura captura de datos: sin máquina de estados ni efectos
 * en inventario. GET y PATCH responden con la MISMA forma. La respuesta
 * real SÍ trae `op_id` (comprobado el 2026-10-10), pero no folio ni estatus;
 * `op_id` no se tipa porque nada lo lee: el que abre el diálogo ya lo conoce.
 *
 * El GET siempre responde; el PATCH se rechaza con 409 `{ msg }` si la OP está
 * Completada (5) o Cancelada (7) — ver `isClosedProductionOrderStatus`.
 *
 * El GET no escribe: una OP sin captura responde los valores por defecto con
 * `updated_at: null`, y el renglón nace en el primer PATCH. Se pide solo al
 * abrir el diálogo porque nada más lo muestra y cada apertura necesita una
 * lectura fresca, no porque pedirlo tenga efectos.
 *
 * Nombres de campo EXACTOS del backend, tomados de una respuesta real.
 * Fechas "yyyy-mm-dd"; datetimes con offset (`-06:00`).
 */

/** Campos que el PATCH acepta. */
export interface CriticalPathWritableFields {
  // ── Desarrollo de producto ──
  fecha_liberacion_paquete_tecnico: string | null;
  estatus_paquete_tecnico: EstatusPaqueteTecnico | null;

  // ── Telas y avíos ──
  // Casillas INDEPENDIENTES: el backend no las excluye entre sí.
  existencia_tela: boolean;
  sin_existencia_tela: boolean;
  existencia_avios: boolean;
  sin_existencia_avios: boolean;
  fecha_real_surtido_telas: string | null;
  fecha_real_surtido_avios: string | null;
  corte_externo: boolean;
  comentarios_telas_avios: string | null;
  kit_completo: boolean;
  fecha_embarque_materia_prima: string | null;
  /** Sin validación en el backend (ni contra el embarque ni contra hoy). */
  fecha_llegada_centro_confeccion: string | null;

  // ── Trazo ──
  fecha_trazo: string | null;

  // ── Corte ──
  fecha_real_corte: string | null;
  /**
   * Decimal (12,2) serializado como string ("120.00"). El backend acepta
   * negativos y fracciones; la regla "número entero de piezas, no negativo" es
   * del cliente.
   */
  cantidad_real_corte: string | null;

  // ── Producción ──
  corte_recibido: boolean;
}

/** Campos de solo lectura que calcula el servidor. */
export interface CriticalPathReadOnlyFields {
  /** Etiqueta ya resuelta de `estatus_paquete_tecnico`; `null` sin estatus. */
  estatus_paquete_tecnico_display: string | null;
  /**
   * Sellos de las casillas de EXISTENCIA (la del mismo nombre). El servidor los
   * pone en "ahora" cada vez que la casilla CAMBIA de valor, en ambos sentidos:
   * desmarcarla la vuelve a sellar en vez de limpiarla. Por eso son el "último
   * cambio" de la casilla, no la fecha en que se confirmó la existencia.
   */
  fecha_existencia_tela: string | null;
  fecha_sin_existencia_tela: string | null;
  fecha_existencia_avios: string | null;
  fecha_sin_existencia_avios: string | null;
  /**
   * Sello de `kit_completo`, con OTRA semántica que los de existencia: el
   * servidor lo pone al pasar de false a true y lo LIMPIA (`null`) al pasar de
   * true a false; reenviar el mismo valor no lo toca. Es la fecha en que el kit
   * quedó completo. Si se envía en un PATCH se ignora. Registros anteriores al
   * campo pueden traer `kit_completo: true` con este sello en `null`.
   */
  fecha_kit_completo: string | null;
  /** `null` mientras la OP no tenga captura (el renglón aún no existe). */
  updated_at: string | null;
}

export type ProductionOrderCriticalPath = CriticalPathWritableFields & CriticalPathReadOnlyFields;

/** Cuerpo del PATCH: solo los campos que cambiaron. */
export type CriticalPathUpdateBody = Partial<CriticalPathWritableFields>;

/**
 * Lo que el diálogo necesita saber de la OP, tomado de quien lo abre (la
 * respuesta no trae folio ni estatus).
 */
export interface CriticalPathTarget {
  opId: number;
  folio: string;
  /** `estatus_op` de la OP al abrir: decide el modo de solo lectura. */
  estatusOp: number;
}
