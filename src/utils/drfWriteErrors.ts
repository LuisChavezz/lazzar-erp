import { AxiosError } from "axios";
import { firstDrfMessage } from "./firstDrfMessage";
import { firstDrfFieldMessage } from "./firstDrfFieldMessage";

/**
 * Manejo de los errores de escritura de DRF que comparten los módulos de RH
 * (vacaciones, permisos y ausencias, asistencia). El backend responde con dos
 * formas y aquí se atienden ambas:
 *
 * - Validación del serializer (alta/edición): diccionario por campo,
 *   `{"fecha_fin": ["..."]}`.
 * - Acciones (`aprobar/`, `rechazar/`, `registrar_entrada/`...): `{"detail": "..."}`.
 */

/**
 * Error de alta/edición. Un 400 pinta cada mensaje bajo su campo (si el campo
 * está en `formFields`) y devuelve el texto del toast: el mensaje de objeto
 * (`non_field_errors`/`detail`) o, si el error cae en un campo que el form no
 * muestra, ese mensaje, para que no se pierda. Un 403 muestra su `detail`
 * (`forbiddenDetailMessage`: el motivo de `PermissionDenied`) o el respaldo, y
 * nunca pinta campos. Cualquier otro error (red, 5xx) cae al respaldo en
 * español.
 */
export const handleDrfWriteError = <F extends string>(
  error: unknown,
  fallback: string,
  formFields: readonly F[],
  setFieldError?: (field: F, message: string) => void
): string => {
  if (isForbiddenError(error)) {
    return forbiddenDetailMessage(error) ?? fallback;
  }
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

/** ¿El error es un 403 de la API? (el usuario no tiene permiso para la acción). */
export const isForbiddenError = (error: unknown): boolean =>
  error instanceof AxiosError && error.response?.status === 403;

/** 4xx pasajeros: el servidor tardó (408) o pidió bajar el ritmo (429). */
const TRANSIENT_CLIENT_STATUSES = new Set([408, 429]);

/**
 * ¿La API respondió con un 4xx definitivo? Repetir la misma petición dará la
 * misma respuesta: sirve para no reintentar una consulta (`retry`). 408 y 429
 * NO cuentan: son pasajeros y un reintento sí puede salir bien.
 */
export const isClientError = (error: unknown): boolean => {
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return status !== undefined && status >= 400 && status < 500 && !TRANSIENT_CLIENT_STATUSES.has(status);
};

/**
 * ¿El error es un 404 o un 403 de la API? Para un detalle, ambos dicen lo
 * mismo: el registro ya no existe o el usuario ya no puede verlo.
 */
export const isNotFoundOrForbiddenError = (error: unknown): boolean =>
  isNotFoundError(error) || isForbiddenError(error);

/**
 * Motivo de un `403` de DRF (`{"detail": "..."}`), o `undefined` si el error no
 * es un `403` o no trae mensaje. Para escrituras que caen a un texto fijo: desde
 * EC-711 el backend responde `403` sin `E-FIN-FACTURAS` con un `detail` que dice
 * qué falta, y un "Error al registrar…" genérico lo escondía.
 *
 * Existe aparte de `drfActionErrorMessage` porque ese también remapea 400, 404
 * y 409: usarlo en los catálogos de Finanzas cambiaría cómo muestran sus errores
 * de campo. Este solo mira el `403`; el resto conserva su manejo.
 *
 * Solo lee `detail`: es la forma de `PermissionDenied`. Un 403 sin él (cuerpo
 * HTML de un proxy, o llaves con forma de campo) da `undefined` para que el
 * llamador use su propio texto, en vez de mostrar un valor suelto de campo.
 */
export const forbiddenDetailMessage = (error: unknown): string | undefined => {
  if (!isForbiddenError(error)) return undefined;
  const data = (error as AxiosError).response?.data;
  return data && typeof data === "object"
    ? firstDrfMessage((data as Record<string, unknown>).detail)
    : undefined;
};

/**
 * ¿El backend RECHAZÓ la acción por una regla de negocio (400, 403 o 409)?
 * Son los mismos estados en los que `drfActionErrorMessage` muestra el mensaje
 * del backend: reintentar igual no sirve, así que un diálogo de acción puede
 * cerrarse. Red, 5xx y 404 no cuentan (el 404 se trata aparte).
 */
export const isDrfActionRejection = (error: unknown): boolean => {
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return status === 400 || status === 403 || status === 409;
};

/**
 * Error de una acción sobre un registro (aprobar, rechazar, eliminar, checar).
 * Un 404 significa que otra persona ya lo borró (`notFoundMessage`); un
 * 400/403 trae su `detail` en español. Un 409 (conflicto: el borrado que
 * choca con registros que dependen de él, una checada ya registrada) muestra
 * su `detail` cuando es texto, porque es lo único que explica QUÉ chocó. Red
 * y 5xx caen al respaldo.
 */
export const drfActionErrorMessage = (
  error: unknown,
  fallback: string,
  notFoundMessage: string
): string => {
  if (isNotFoundError(error)) {
    return notFoundMessage;
  }
  if (!isDrfActionRejection(error)) {
    return fallback;
  }
  const status = (error as AxiosError).response?.status;
  if (status === 400 || status === 403) {
    return firstDrfFieldMessage(error) ?? fallback;
  }
  // 409
  const data = (error as AxiosError).response?.data;
  const detail =
    data && typeof data === "object" ? (data as Record<string, unknown>).detail : undefined;
  return typeof detail === "string" && detail.trim() ? detail : fallback;
};
