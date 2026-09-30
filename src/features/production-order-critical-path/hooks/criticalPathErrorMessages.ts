import { handleDrfWriteError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import {
  CRITICAL_PATH_FORM_FIELDS,
  type CriticalPathField,
} from "../schemas/production-order-critical-path.schema";

export type SetCriticalPathFieldError = (field: CriticalPathField, message: string) => void;

/** 404: la OP no existe o es de otra empresa (el backend no distingue). */
export const CRITICAL_PATH_NOT_FOUND_MESSAGE =
  "No se encontró la orden de producción. Puede que ya no exista o que no pertenezca a tu empresa.";

/**
 * Error del PATCH. Un 400 pinta cada mensaje bajo su campo y devuelve el del
 * toast; una llave que el formulario no muestra —en particular `permiso`
 * ("Acción disponible solo para producción.")— llega TAL CUAL al toast. Un
 * 404 dice que la OP no se encontró; red y 5xx caen al respaldo.
 */
export const handleCriticalPathWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetCriticalPathFieldError
): string =>
  isNotFoundError(error)
    ? CRITICAL_PATH_NOT_FOUND_MESSAGE
    : handleDrfWriteError(error, fallback, CRITICAL_PATH_FORM_FIELDS, setFieldError);
