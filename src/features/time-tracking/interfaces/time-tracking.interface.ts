import type { TipoControlHoras } from "../constants/timeTrackingChoices";

/**
 * Tramo de control de horas tal como lo devuelve `/hr/control-horas/`
 * (listado y detalle comparten la forma). Desglosa UNA asistencia en tramos
 * por OP o tarea. Los FK llegan como id crudo, sin nombres anidados.
 *
 * El backend no valida la coherencia entre `empleado`, `fecha` y
 * `asistencia`, ni traslapes o límites: todo eso lo hace este módulo.
 */
export interface TimeSegment {
  id: number;
  empleado: number;
  asistencia: number;
  /** `op_id` de la orden de producción, o `null` ("Sin OP"). */
  op: number | null;
  /** "YYYY-MM-DD". */
  fecha: string;
  /** Datetime ISO con el offset de México. */
  hora_inicio: string;
  /**
   * Datetime ISO con offset, o `null`: un tramo abierto. Este módulo nunca
   * crea uno (el fin es obligatorio en el cliente), pero pueden existir.
   */
  hora_fin: string | null;
  /**
   * Decimal como string. El servidor lo recalcula cuando hay ambas horas; sin
   * `hora_fin` guarda lo que se le mande, así que NUNCA se envía. Se tipa
   * `null`-able por defensa: el contrato no garantiza un valor en un tramo
   * abierto.
   */
  readonly horas_trabajadas: string | null;
  tipo: TipoControlHoras;
  /** Texto libre opcional: puede volver como `null` o "". */
  descripcion: string | null;
}

/**
 * Filtros de SERVIDOR que usa el módulo. No hay filtro por `asistencia`: como
 * `(empleado, fecha)` es único en asistencias, se pide por empleado y día y se
 * conservan en el cliente los tramos cuya `asistencia` es la del registro.
 */
export interface TimeSegmentListParams {
  empleado: number;
  fecha: string;
}

/**
 * Alta (POST). `empleado`, `asistencia` y `fecha` salen SIEMPRE de la
 * asistencia padre; la persona nunca los elige. Sin `horas_trabajadas`.
 */
export interface TimeSegmentCreateBody {
  empleado: number;
  asistencia: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: TipoControlHoras;
  op: number | null;
  descripcion: string | null;
}

/**
 * Edición (PATCH). Las DOS horas viajan siempre: un PATCH con solo
 * `hora_inicio` se valida contra el cuerpo y no contra el fin guardado, y
 * puede dejar horas negativas. El resto, solo si cambió. Sin
 * `horas_trabajadas`.
 */
export interface TimeSegmentUpdateBody {
  hora_inicio: string;
  hora_fin: string;
  tipo?: TipoControlHoras;
  op?: number | null;
  descripcion?: string | null;
}
