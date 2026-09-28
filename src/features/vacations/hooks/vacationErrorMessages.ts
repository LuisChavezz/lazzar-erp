import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import type { VacationFormValues } from "../schemas/vacation.schema";
import { getEstadoVacacionLabel } from "../constants/vacationChoices";

/**
 * El backend responde con DOS formas de error y aquí se atienden ambas:
 *
 * - Validación del serializer (alta/edición): diccionario por campo,
 *   `{"fecha_fin": ["..."]}`.
 * - Acciones (`aprobar/`, `rechazar/`): `{"detail": "..."}`, con 400 si la
 *   solicitud ya no está pendiente y 403 si es de otra empresa.
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

/**
 * Error de alta/edición. Un 400 pinta cada mensaje bajo su campo (si el campo
 * existe en el form) y devuelve el texto del toast: el mensaje de objeto
 * (`non_field_errors`/`detail`) o, si el error cae en un campo que el form no
 * muestra, ese mensaje, para que no se pierda. Cualquier otro error (red, 5xx)
 * cae al respaldo en español.
 */
export const handleVacationWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetVacationFieldError
): string => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) {
    return fallback;
  }
  const data = error.response.data;
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  let hiddenFieldMessage: string | undefined;

  Object.entries(record).forEach(([key, value]) => {
    if (key === "non_field_errors" || key === "detail") {
      return;
    }
    const message = firstDrfMessage(value);
    if (!message) {
      return;
    }
    if (setFieldError && FORM_FIELDS.includes(key as VacationFormField)) {
      setFieldError(key as VacationFormField, message);
    } else {
      hiddenFieldMessage ??= message;
    }
  });

  return (
    firstDrfMessage(record.non_field_errors) ??
    firstDrfMessage(record.detail) ??
    hiddenFieldMessage ??
    fallback
  );
};

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
 * Error de una acción sobre una solicitud (aprobar, rechazar, eliminar). Un
 * 404 significa que otra persona ya la borró; un 400/403 trae su `detail` en
 * español. Red y 5xx caen al respaldo.
 */
export const vacationActionErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }
  const status = error.response?.status;
  if (status === 404) {
    return VACATION_GONE_MESSAGE;
  }
  if (status === 400 || status === 403) {
    return firstDrfFieldMessage(error) ?? fallback;
  }
  return fallback;
};
