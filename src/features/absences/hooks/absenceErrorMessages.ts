import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import type { AbsenceFormValues } from "../schemas/absence.schema";
import { getEstadoAusenciaLabel } from "../constants/absenceChoices";

/**
 * Textos de error de permisos y ausencias. La lógica de DRF (errores por campo
 * del serializer y `{"detail"}` de las acciones) vive en
 * `src/utils/drfWriteErrors.ts`, compartida con vacaciones; aquí quedan los
 * campos del formulario y los mensajes propios del módulo.
 */

type AbsenceFormField = keyof AbsenceFormValues;

const FORM_FIELDS: readonly AbsenceFormField[] = [
  "empleado",
  "tipo",
  "fecha_inicio",
  "fecha_fin",
  "con_goce_sueldo",
  "motivo",
];

export type SetAbsenceFieldError = (field: AbsenceFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleAbsenceWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetAbsenceFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);

/** Un registro que otra persona ya borró (404). */
export const ABSENCE_GONE_MESSAGE = "El registro ya no existe. Se actualizó el listado.";

/**
 * Un registro que cambió de estado mientras su diálogo estaba abierto. La
 * etiqueta del estado va CITADA ("«Falta confirmada»", "«Descartada»",
 * "«Aprobado»"): así la frase no tiene que concordar en género con cada tipo.
 * Lo comparten la guarda de red y la vía rápida de la caché.
 */
export const absenceEstadoChangedMessage = (tipo: string, estado: string): string =>
  `El registro cambió de estado (ahora: «${getEstadoAusenciaLabel(tipo, estado) ?? estado}»). Se actualizó el listado.`;

/** La guarda previa a una escritura no pudo consultar el servidor. */
export const ABSENCE_CHECK_FAILED_MESSAGE =
  "No se pudo verificar el registro contra el servidor. Revisa tu conexión e intenta de nuevo.";

/**
 * La guarda previa no pudo consultar los OTROS recursos del empleado
 * (vacaciones): lo que quedó sin verificar es el traslape, no el estado.
 */
export const ABSENCE_OVERLAP_CHECK_FAILED_MESSAGE =
  "No se pudo verificar si el periodo se traslapa con vacaciones del empleado, así que no se guardó nada. Revisa tu conexión e intenta de nuevo.";

/** Error de una acción sobre un registro: ver `drfActionErrorMessage`. */
export const absenceActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, ABSENCE_GONE_MESSAGE);
