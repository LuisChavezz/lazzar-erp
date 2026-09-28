import type { EstadoVacacion } from "../constants/vacationChoices";

/**
 * Solicitud de vacaciones de un empleado.
 *
 * Listado y detalle devuelven la MISMA forma (`fields = '__all__'`), arreglo
 * plano sin paginación ordenado por `-fecha_solicitud`. Los FK llegan como ID
 * crudo, sin nombres: `empleado` se resuelve contra el catálogo de empleados y
 * los tres usuarios contra `/usuarios/`.
 *
 * Sin `empresa` ni `activo`: el backend resuelve el tenant a partir de
 * `empleado` y el DELETE borra la fila físicamente.
 */
export interface Vacation {
  id: number;
  /** FK REQUERIDO a `hr.Empleado`. */
  empleado: number;
  /** DateField `"YYYY-MM-DD"`. */
  fecha_inicio: string;
  /** DateField `"YYYY-MM-DD"`, nunca anterior a `fecha_inicio`. */
  fecha_fin: string;
  /**
   * Lo captura el cliente; el backend no lo contrasta con el rango. El
   * formulario lo sugiere con los días laborales del turno del empleado.
   */
  dias_solicitados: number;
  /** Texto libre, nullable. */
  motivo: string | null;
  estado: EstadoVacacion;

  // ── Trazabilidad: SOLO LECTURA, las fija el servidor ─────────────────────
  /** FK a `usuarios.Usuario`: quien capturó la solicitud. */
  solicitado_por: number | null;
  /** Datetime ISO. */
  fecha_solicitud: string;
  /**
   * FK a `usuarios.Usuario`: quien aprobó. Puede ser `null` incluso en una
   * aprobada: una solicitud aprobada por PATCH de `estado` no deja rastro.
   */
  autorizado_por: number | null;
  fecha_aprobacion: string | null;
  rechazado_por: number | null;
  fecha_rechazo: string | null;
  /** Solo lo escribe `rechazar/`. Puede llegar como `""` en vez de `null`. */
  motivo_rechazo: string | null;
  /** Nunca lo calcula el servidor; fuera de alcance (saldo). No se muestra. */
  dias_disponibles_al_momento: number | null;
}

/**
 * Cuerpo real del alta y de la edición (PATCH). Campo por campo: NUNCA lleva
 * `estado`, `motivo_rechazo` ni los campos de trazabilidad.
 *
 * `dias_disponibles_al_momento` viaja SIEMPRE como `null` (el saldo está fuera
 * de alcance). En la edición las dos fechas viajan juntas: el backend solo
 * compara las que recibe en la petición.
 */
export interface VacationWrite {
  empleado: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  motivo: string | null;
  dias_disponibles_al_momento: null;
}

/** Variables de la mutación de edición: el cuerpo más el `id` de la ruta. */
export interface VacationUpdateVariables extends VacationWrite {
  id: number;
}

/** Cuerpo de `POST /hr/vacaciones/{id}/rechazar/`. */
export interface VacationRejectBody {
  motivo_rechazo: string;
}

/** Variables de la mutación de rechazo. */
export interface VacationRejectVariables extends VacationRejectBody {
  id: number;
}
