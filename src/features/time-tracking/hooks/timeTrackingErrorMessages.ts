import toast from "react-hot-toast";
import {
  drfActionErrorMessage,
  handleDrfWriteError,
  isNotFoundError,
} from "@/src/utils/drfWriteErrors";
import { TimeSegmentFields, type TimeSegmentField } from "../schemas/time-tracking.schema";

/**
 * Textos de error del desglose. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts`, compartida con los demás módulos de RH.
 */

/** Campos que muestra el formulario: los del esquema. */
const SEGMENT_FORM_FIELDS = Object.keys(TimeSegmentFields) as TimeSegmentField[];

export type SetTimeSegmentFieldError = (field: TimeSegmentField, message: string) => void;

/** Un tramo que otra persona ya borró (404 en un PATCH o DELETE). */
export const SEGMENT_GONE_MESSAGE = "El tramo ya no existe. Se actualizó el desglose.";

/**
 * Toast de error de una escritura de tramos. El de "ya no existe" lleva un id
 * FIJO: el 404 de la propia mutación y el cierre por datos obsoletos del
 * diálogo describen lo mismo y deben verse como UN solo aviso.
 */
export const SEGMENT_GONE_TOAST_ID = "time-segment-gone";

export const toastTimeSegmentError = (message: string) =>
  toast.error(message, message === SEGMENT_GONE_MESSAGE ? { id: SEGMENT_GONE_TOAST_ID } : undefined);

/**
 * Error de alta o edición. Un 400 pinta cada mensaje bajo su campo (p. ej.
 * `hora_fin` anterior al inicio, o una OP de otra empresa) y devuelve el del
 * toast; un error en un campo que el formulario no muestra (`asistencia`,
 * `empleado`) llega al toast. Un 404 dice que el tramo ya no existe.
 */
export const handleTimeSegmentWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetTimeSegmentFieldError
): string =>
  isNotFoundError(error)
    ? SEGMENT_GONE_MESSAGE
    : handleDrfWriteError(error, fallback, SEGMENT_FORM_FIELDS, setFieldError);

/** Error del borrado. */
export const timeSegmentActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, SEGMENT_GONE_MESSAGE);
