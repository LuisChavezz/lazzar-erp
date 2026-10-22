import { AxiosError } from "axios";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";

/**
 * ¿El backend NO confirmó el resultado? Sin respuesta (red, timeout, o un 504
 * de la plataforma sin cabeceras CORS) o con un 5xx. Emitir y timbrar llaman a
 * Facturama: en estos casos el CFDI pudo generarse aunque la respuesta se
 * perdiera, así que no se puede decir "no se guardó nada". El cuerpo de estas
 * respuestas no es del backend (p. ej. la página de error de Vercel) y nunca
 * se muestra.
 */
export const isUnconfirmedFailure = (error: unknown): boolean =>
  error instanceof AxiosError && (!error.response || error.response.status >= 500);

/**
 * ¿Es un rechazo esperado? El precheck que detuvo la acción o un 4xx del
 * backend: ya se le avisa al usuario y no es un fallo del sistema, así que no
 * va a la consola.
 */
export const isExpectedError = (error: unknown): boolean =>
  error instanceof PrecheckError ||
  (error instanceof AxiosError &&
    error.response !== undefined &&
    error.response.status >= 400 &&
    error.response.status < 500);

/** Registra en consola solo los fallos inesperados (5xx, red, bugs). */
export const logUnexpectedError = (error: unknown) => {
  if (!isExpectedError(error)) console.error(error);
};

/** Timbrado sin confirmar: el backend pudo dejar la nota `cfdi_pendiente`. */
export const CREDIT_NOTE_STAMP_UNCONFIRMED_MESSAGE =
  "No se pudo confirmar el timbrado: el servidor no respondió a tiempo. Revisa el detalle de la nota antes de reintentar; si quedó pendiente de confirmación, un administrador debe revisarlo.";

/** Emisión sin confirmar: pudo emitirse y timbrarse aunque se perdiera la respuesta. */
export const CREDIT_NOTE_EMIT_UNCONFIRMED_MESSAGE =
  "No se pudo confirmar la emisión: el servidor no respondió a tiempo. Revisa el listado antes de reintentar; la nota pudo emitirse y timbrarse.";

/**
 * Mensaje de un fallo de `timbrar/`, igual que `stampInvoiceErrorMessage`: el
 * motivo del backend tal cual bajo `cfdi` o `estatus`, luego cualquier campo, y
 * al final el extractor genérico. Un fallo sin confirmar no muestra el cuerpo.
 */
export const stampNotaCreditoErrorMessage = (error: unknown): string => {
  if (error instanceof PrecheckError) return error.message;
  if (isUnconfirmedFailure(error)) return CREDIT_NOTE_STAMP_UNCONFIRMED_MESSAGE;
  return (
    drfFieldMessage(error, "cfdi") ??
    drfFieldMessage(error, "estatus") ??
    firstDrfFieldMessage(error) ??
    extractErrorMessage(error, "No se pudo timbrar la nota de crédito.")
  );
};
