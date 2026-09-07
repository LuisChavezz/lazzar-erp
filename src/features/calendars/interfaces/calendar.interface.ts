import type { TipoCalendario } from "../constants/tipoCalendario";

/**
 * Día del calendario laboral de un turno.
 *
 * A diferencia del resto de catálogos de RH, `Calendario` NO tiene `activo`:
 * no hay baja lógica y el DELETE borra la fila de verdad.
 */
export interface Calendar {
  id: number;
  fecha: string;
  tipo: TipoCalendario | null;
  /** FK REQUERIDO a `hr.Turno`. Es también por donde el backend resuelve el tenant. */
  turno: number;
}

/**
 * Datos que captura el formulario, y cuerpo real que se envía.
 *
 * No existe un tipo `CalendarPayload` aparte porque `empresa` NUNCA viaja: el
 * backend la resuelve a partir de `turno`, igual que en áreas la resuelve a
 * partir de `departamento`. Por eso el hook de alta tampoco lee el workspace.
 */
export interface CalendarCreate {
  fecha: string;
  tipo: TipoCalendario;
  turno: number;
}
