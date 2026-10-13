import { AxiosError } from "axios";
import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import type { SeguimientoFormValues } from "../schemas/seguimiento.schema";

/**
 * Textos de error de los seguimientos. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts`; aquí quedan los campos del formulario y los
 * mensajes propios.
 *
 * Los nombres de campo del formulario son los del backend, así que cada error
 * cae bajo su campo. Un error en `oportunidad` (p. ej. "Oportunidad no
 * encontrada.", si se dio de baja entretanto) no tiene campo en el formulario y
 * sale en el toast.
 */

type SeguimientoFormField = keyof SeguimientoFormValues;

const FORM_FIELDS: readonly SeguimientoFormField[] = ["tipo", "detalle", "fecha_recordatorio"];

export type SetSeguimientoFieldError = (field: SeguimientoFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleSeguimientoWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetSeguimientoFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);

/**
 * ¿El alta se rechazó por la OPORTUNIDAD? El backend responde 400 con el error
 * en `oportunidad` ("Oportunidad no encontrada.") cuando se dio de baja —o dejó
 * de ser visible— mientras se capturaba el seguimiento. No es algo que el
 * usuario pueda corregir en el formulario: no hay nada que reintentar.
 */
export const isOpportunityRejectedError = (error: unknown): boolean =>
  error instanceof AxiosError &&
  error.response?.status === 400 &&
  firstRejectionMessage(error.response.data, ["oportunidad"]) !== undefined;

/** Otra persona ya lo eliminó (404). */
export const SEGUIMIENTO_GONE_MESSAGE = "El seguimiento ya no existe. Se actualizó el historial.";

/** Error de completar, reabrir o eliminar: un 404 significa que ya no existe. */
export const seguimientoActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, SEGUIMIENTO_GONE_MESSAGE);
