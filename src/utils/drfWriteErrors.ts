import { AxiosError } from "axios";
import { firstDrfMessage } from "./firstDrfMessage";
import { firstDrfFieldMessage } from "./firstDrfFieldMessage";

/**
 * Manejo de los errores de escritura de DRF que comparten los catálogos de RH
 * con flujo de aprobación (vacaciones, permisos y ausencias). El backend
 * responde con dos formas y aquí se atienden ambas:
 *
 * - Validación del serializer (alta/edición): diccionario por campo,
 *   `{"fecha_fin": ["..."]}`.
 * - Acciones (`aprobar/`, `rechazar/`): `{"detail": "..."}`.
 */

/**
 * Error de alta/edición. Un 400 pinta cada mensaje bajo su campo (si el campo
 * está en `formFields`) y devuelve el texto del toast: el mensaje de objeto
 * (`non_field_errors`/`detail`) o, si el error cae en un campo que el form no
 * muestra, ese mensaje, para que no se pierda. Cualquier otro error (red, 5xx)
 * cae al respaldo en español.
 */
export const handleDrfWriteError = <F extends string>(
  error: unknown,
  fallback: string,
  formFields: readonly F[],
  setFieldError?: (field: F, message: string) => void
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
    if (setFieldError && formFields.includes(key as F)) {
      setFieldError(key as F, message);
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

/** ¿El error es un 404 de la API? (el registro ya no existe). */
export const isNotFoundError = (error: unknown): boolean =>
  error instanceof AxiosError && error.response?.status === 404;

/**
 * Error de una acción sobre un registro (aprobar, rechazar, eliminar). Un 404
 * significa que otra persona ya lo borró (`notFoundMessage`); un 400/403 trae
 * su `detail` en español. Red y 5xx caen al respaldo.
 */
export const drfActionErrorMessage = (
  error: unknown,
  fallback: string,
  notFoundMessage: string
): string => {
  if (isNotFoundError(error)) {
    return notFoundMessage;
  }
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  if (status === 400 || status === 403) {
    return firstDrfFieldMessage(error) ?? fallback;
  }
  return fallback;
};
