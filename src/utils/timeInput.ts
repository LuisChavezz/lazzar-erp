/**
 * Piezas comunes de los formularios de RH que capturan horas con
 * `<input type="time">` sobre un día (asistencia y control de horas). Viven
 * aquí, y no en uno de los dos features, porque asistencia monta el desglose
 * de control de horas: importarlas de un feature al otro los haría depender
 * mutuamente.
 */

export const HORA_INVALIDA_MESSAGE = "Captura una hora válida (HH:MM).";

/** La hora cae en el salto de horario de verano de un año anterior a 2022. */
export const HORA_INEXISTENTE_MESSAGE =
  "Esa hora no existe en la zona horaria de México para este día.";

/** Una hora GUARDADA de un registro: lo que muestra el input y el datetime completo. */
export interface StoredTime {
  /** "HH:MM" con que se sembró el input ("" si no había hora). */
  hhmm: string;
  /** Datetime ISO de la API, con segundos, o `null`. */
  iso: string | null;
}
