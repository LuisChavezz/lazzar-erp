import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import type { VacationFormValues } from "../schemas/vacation.schema";
import { getEstadoVacacionLabel } from "../constants/vacationChoices";

/**
 * Textos de error de vacaciones. La lógica de DRF (errores por campo del
 * serializer y `{"detail"}` de las acciones, con 400 si la solicitud ya no está
 * pendiente y 403 si es de otra empresa) vive en `src/utils/drfWriteErrors.ts`,
 * compartida con permisos y ausencias; aquí quedan los campos del formulario y
 * los mensajes propios del módulo.
 */

type VacationFormField = keyof VacationFormValues;

const FORM_FIELDS: readonly VacationFormField[] = [
  "empleado",
  "fecha_inicio",
  "fecha_fin",
  "dias_solicitados",
  "motivo",
];

export type SetVacationFieldError = (field: VacationFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleVacationWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetVacationFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);

/** Mensaje de una solicitud que otra persona ya borró (404). */
export const VACATION_GONE_MESSAGE = "La solicitud ya no existe. Se actualizó el listado.";

/**
 * Mensaje de una solicitud que cambió de estado mientras su diálogo estaba
 * abierto. Lo comparten la guarda de red (`verifyVacationEstado`) y la vía
 * rápida de la caché (`VacationList`), para que ambas digan lo mismo.
 */
export const vacationEstadoChangedMessage = (estado: string): string =>
  `La solicitud cambió de estado: ya está ${(getEstadoVacacionLabel(estado) ?? estado).toLowerCase()}. Se actualizó el listado.`;

/** La guarda previa a una escritura no pudo consultar el servidor (red, 5xx). */
export const VACATION_CHECK_FAILED_MESSAGE =
  "No se pudo verificar el estado de la solicitud. Revisa tu conexión e intenta de nuevo.";

/**
 * La guarda previa no pudo consultar los OTROS recursos del empleado (permisos
 * y ausencias): lo que quedó sin verificar es el traslape, no el estado.
 */
export const VACATION_OVERLAP_CHECK_FAILED_MESSAGE =
  "No se pudo verificar si el periodo se traslapa con permisos o ausencias del empleado, así que no se guardó nada. Revisa tu conexión e intenta de nuevo.";

/** Error de una acción sobre una solicitud: ver `drfActionErrorMessage`. */
export const vacationActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, VACATION_GONE_MESSAGE);
