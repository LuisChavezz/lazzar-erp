import type { TipoSeguimiento } from "../constants/seguimientoChoices";

/**
 * Seguimiento de una oportunidad (`/ventas/oportunidad-seguimientos/`): una
 * nota, llamada, correo, visita o tarea, con recordatorio opcional. Es el
 * mecanismo de pendientes del CRM. `onboarding` devuelve la MISMA forma en
 * `seguimientos`.
 *
 * - `oportunidad` se fija al crear y no cambia.
 * - `vendedor` es el AUTOR: lo pone el backend con el usuario de la sesión; es
 *   de solo lectura.
 * - `fecha_recordatorio` es una fecha-calendario (`YYYY-MM-DD`), sin hora.
 * - `completado_at` lo pone el backend al completar y lo limpia al reabrir.
 * - `created_at` y `completado_at` son timestamps con offset.
 *
 * Los cuatro campos opcionales del final los añade un cambio del backend que
 * puede no estar desplegado: nada debe depender de que existan.
 * `vendedor_nombre` puede llegar vacío (`""`) si el usuario no tiene nombre:
 * se trata igual que ausente.
 */
export interface OpportunitySeguimiento {
  id: number;
  oportunidad: number;
  vendedor: number | null;
  tipo: TipoSeguimiento;
  detalle: string;
  fecha_recordatorio: string | null;
  completado: boolean;
  completado_at: string | null;
  created_at: string | null;
  vendedor_nombre?: string | null;
  oportunidad_titulo?: string | null;
  oportunidad_nombre_contacto?: string | null;
  oportunidad_cliente_nombre?: string | null;
}

/**
 * Alta. `completado` NO se envía: un seguimiento nace pendiente, y mandarlo en
 * `true` lo deja completado sin `completado_at`. `fecha_recordatorio` se omite
 * cuando la oportunidad está cerrada (no genera recordatorios).
 */
export interface SeguimientoCreate {
  oportunidad: number;
  tipo: TipoSeguimiento;
  detalle: string;
  fecha_recordatorio?: string | null;
}

/** Edición (PATCH): solo los campos que cambiaron. `oportunidad` nunca viaja. */
export type SeguimientoPatch = Partial<Pick<SeguimientoCreate, "tipo" | "detalle" | "fecha_recordatorio">>;

export interface SeguimientoUpdateVariables {
  id: number;
  changes: SeguimientoPatch;
}

/** Completar (`true`) o reabrir (`false`) un seguimiento. */
export interface SeguimientoCompletadoVariables {
  id: number;
  completado: boolean;
}
