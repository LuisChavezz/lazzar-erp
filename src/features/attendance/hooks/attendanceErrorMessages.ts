import {
  drfActionErrorMessage,
  handleDrfWriteError,
  isNotFoundError,
} from "@/src/utils/drfWriteErrors";
import { AxiosError } from "axios";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import type { AttendanceCorrectionField } from "../schemas/attendance.schema";

/**
 * Textos de error de asistencia. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts`, compartida con los demás módulos de RH; aquí
 * quedan los campos del diálogo de corrección y los mensajes propios.
 */

const CORRECTION_FIELDS: readonly AttendanceCorrectionField[] = [
  "hora_entrada",
  "hora_salida",
  "observaciones",
];

export type SetAttendanceFieldError = (field: AttendanceCorrectionField, message: string) => void;

/** El alta chocó con el registro único de `(empleado, fecha)`. */
export const DUPLICATE_ATTENDANCE_MESSAGE =
  "Ya existe un registro de asistencia para este empleado en esa fecha.";

/**
 * ¿Es un 400 con `non_field_errors`? En el ALTA de asistencias es la única
 * fuente de esa llave: el serializer reporta sus reglas por campo
 * (`hora_entrada`, `hora_salida`, `empleado`...) y el único error de objeto es
 * la unicidad de `(empleado, fecha)`, tanto la del validador de DRF como la del
 * choque concurrente (`_choque_de_unicidad_como_400`). Se detecta por la llave
 * y no por el texto del backend, que podría cambiar.
 */
export const isNonFieldValidationError = (error: unknown): boolean =>
  error instanceof AxiosError &&
  error.response?.status === 400 &&
  drfFieldMessage(error, "non_field_errors") !== undefined;

/** Un registro que otra persona ya borró (404 en un PATCH o DELETE). */
export const ATTENDANCE_GONE_MESSAGE =
  "El registro de asistencia ya no existe. Se actualizó el listado.";

/**
 * Error de alta o corrección. Un 400 pinta cada mensaje bajo su campo (si el
 * diálogo lo muestra) y devuelve el del toast: `non_field_errors` (p. ej. el
 * duplicado de empleado y fecha), `detail` o el de un campo que el diálogo no
 * muestra. Un 404 dice que el registro ya no existe.
 */
export const handleAttendanceWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetAttendanceFieldError
): string =>
  isNotFoundError(error)
    ? ATTENDANCE_GONE_MESSAGE
    : handleDrfWriteError(error, fallback, CORRECTION_FIELDS, setFieldError);

/**
 * Error de una acción sobre un registro (justificar, eliminar). El 409 del
 * borrado (un `ControlHoras` depende del registro) muestra el `detail` del
 * backend (ver `drfActionErrorMessage`).
 */
export const attendanceActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, ATTENDANCE_GONE_MESSAGE);

/**
 * Error de una checada (`registrar_entrada/`, `registrar_salida/`). Aquí el
 * 404 NO significa "otra persona lo borró": trae su propio `detail` (empleado
 * inexistente, o sin registro del día al registrar la salida), así que se
 * muestra ese texto. El 400 (`detail` o `empleado_id`) y el 409 (entrada o
 * salida ya registrada) también llegan con el mensaje del backend.
 */
export const checkInErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(
    error,
    fallback,
    firstDrfFieldMessage(error) ?? "No se encontró el empleado o su registro del día."
  );
