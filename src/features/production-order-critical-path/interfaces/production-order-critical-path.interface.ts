import type { EstatusPaqueteTecnico } from "../constants/criticalPathChoices";

/**
 * Ruta crítica de una orden de producción —
 * `GET|PATCH /produccion/orden-produccion/{op_id}/ruta-critica/`.
 *
 * Un registro por OP, pura captura de datos: sin máquina de estados ni efectos
 * en inventario. GET y PATCH responden con la MISMA forma, que NO incluye
 * `op_id` ni folio (el que abre el diálogo ya los conoce).
 *
 * Ojo: el GET CREA el registro vacío si no existe (`get_or_create`), así que
 * solo se pide al abrir el diálogo, nunca al pintar una página ni en prefetch.
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
   * Sello de la casilla del mismo nombre. El servidor lo pone en "ahora" cada
   * vez que la casilla CAMBIA de valor, en ambos sentidos: desmarcarla lo
   * vuelve a sellar en vez de limpiarlo. Por eso es el "último cambio" de la
   * casilla, no la fecha en que se confirmó la existencia.
   */
  fecha_existencia_tela: string | null;
  fecha_sin_existencia_tela: string | null;
  fecha_existencia_avios: string | null;
  fecha_sin_existencia_avios: string | null;
  updated_at: string;
}

export type ProductionOrderCriticalPath = CriticalPathWritableFields & CriticalPathReadOnlyFields;

/** Cuerpo del PATCH: solo los campos que cambiaron. */
export type CriticalPathUpdateBody = Partial<CriticalPathWritableFields>;

/** Lo que el diálogo necesita saber de la OP (la respuesta no trae id ni folio). */
export interface CriticalPathTarget {
  opId: number;
  folio: string;
}
