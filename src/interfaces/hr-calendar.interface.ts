/**
 * Contrato común del calendario de un empleado en RH.
 *
 * Los recursos que OCUPAN días (vacaciones, permisos y ausencias) se traducen a
 * esta forma para que la regla de traslape (`findCalendarConflict`) no dependa
 * de ningún módulo. Cada módulo traduce SUS registros con SUS constantes —qué
 * estados ocupan y cómo se nombran—; ningún módulo lee los registros de otro.
 */
export interface CalendarOccupant {
  /** Recurso de origen. Junto con `id` identifica el registro (p. ej. el que se edita). */
  kind: string;
  id: number;
  empleado: number;
  /** DateField `"YYYY-MM-DD"`. */
  fecha_inicio: string;
  /** DateField `"YYYY-MM-DD"`. */
  fecha_fin: string;
  /** ¿Ocupa el calendario? Lo decide el módulo dueño (pendiente/aprobado sí, rechazado no). */
  occupies: boolean;
  /**
   * Cómo se nombra el registro dentro del mensaje de traslape, con su estado:
   * "un permiso pendiente", "una solicitud de vacaciones aprobada"...
   */
  description: string;
}

/**
 * Fuente de ocupación de un recurso: la aporta su módulo dueño y la reparte el
 * hub de RH (`HrCalendarOccupancyProvider`), así un formulario consulta los
 * OTROS recursos sin importar sus módulos.
 */
export interface CalendarOccupancySource {
  kind: string;
  /** Registros del empleado, FRESCOS del servidor (sin caché), ya traducidos. */
  fetchByEmployee: (empleado: number) => Promise<CalendarOccupant[]>;
}
