import { z } from "zod";
import { isHHMM, toMexicoIsoDateTime } from "@/src/utils/mexicoTime";
import { HORA_INVALIDA_MESSAGE, type StoredTime } from "@/src/utils/timeInput";

export { HORA_INVALIDA_MESSAGE, type StoredTime };

/**
 * Reglas de horas del registro de asistencia, espejo de
 * `AsistenciaSerializer.validate` del backend (mismos textos). Las horas se
 * capturan como "HH:MM" sobre la `fecha` del registro, así que la regla "la
 * hora local debe caer en `fecha`" se cumple por construcción.
 */

export const HORA_REQUERIDA_MESSAGE = "La hora es requerida";
export const SALIDA_SIN_ENTRADA_MESSAGE = "No se puede registrar la salida sin una hora de entrada.";
export const QUITAR_ENTRADA_CON_SALIDA_MESSAGE =
  "Para quitar la hora de entrada, quita también la hora de salida.";
export const SALIDA_NO_POSTERIOR_MESSAGE = "La hora de salida debe ser posterior a la de entrada.";

/** Hora opcional: vacía ("" = sin hora) o "HH:MM". */
const optionalTime = z.string().refine((value) => value === "" || isHHMM(value), HORA_INVALIDA_MESSAGE);

const AttendanceCorrectionObject = z.object({
  hora_entrada: optionalTime,
  hora_salida: optionalTime,
  observaciones: z.string(),
});

/** Schema de un solo campo, para la validación en blur (un refinamiento ya no expone `.shape`). */
export const AttendanceCorrectionFields = AttendanceCorrectionObject.shape;

export type AttendanceCorrectionValues = z.infer<typeof AttendanceCorrectionObject>;

export type AttendanceCorrectionField = keyof AttendanceCorrectionValues;

export interface AttendanceCorrectionContext {
  fecha: string;
  hora_entrada: StoredTime;
  hora_salida: StoredTime;
}

/**
 * Instante (ms) que tendrá una hora al guardar:
 * - Si la persona NO la cambió, no viaja y el servidor compara contra la
 *   GUARDADA, con sus segundos: se usa el datetime completo.
 * - Si la cambió, viaja como "HH:MM:00" en hora de México.
 *
 * Así la regla no rechaza lo que el servidor acepta: con una salida checada a
 * las 16:26:22 (se ve "16:26"), corregir la entrada a 16:26 es válido.
 * `null` si no hay hora o no se puede resolver.
 */
const effectiveInstant = (value: string, stored: StoredTime, fecha: string): number | null => {
  if (value === stored.hhmm && stored.iso) {
    const ms = Date.parse(stored.iso);
    return Number.isNaN(ms) ? null : ms;
  }
  if (!isHHMM(value)) {
    return null;
  }
  const iso = toMexicoIsoDateTime(fecha, value);
  return iso ? Date.parse(iso) : null;
};

/**
 * Regla cruzada de horas, como función pura: la usan el refinamiento de abajo y
 * el formulario, que la reevalúa cuando cambia la otra hora. Devuelve el campo
 * y el mensaje del error, o `null`.
 *
 * Dónde va el error de "salida sin entrada", igual que en el backend: si la
 * persona BORRÓ una entrada que existía dejando la salida, es de la entrada
 * (hay que quitar ambas); si nunca hubo entrada, es de la salida.
 */
export const getCorrectionTimesError = (
  values: Pick<AttendanceCorrectionValues, "hora_entrada" | "hora_salida">,
  context: AttendanceCorrectionContext
): { field: AttendanceCorrectionField; message: string } | null => {
  const { hora_entrada, hora_salida } = values;
  if (!isHHMM(hora_salida)) {
    return null;
  }
  if (hora_entrada === "") {
    return context.hora_entrada.hhmm !== ""
      ? { field: "hora_entrada", message: QUITAR_ENTRADA_CON_SALIDA_MESSAGE }
      : { field: "hora_salida", message: SALIDA_SIN_ENTRADA_MESSAGE };
  }
  const entrada = effectiveInstant(hora_entrada, context.hora_entrada, context.fecha);
  const salida = effectiveInstant(hora_salida, context.hora_salida, context.fecha);
  // Estricto: una jornada de duración cero tampoco es válida (igual que el backend).
  if (entrada !== null && salida !== null && salida <= entrada) {
    return { field: "hora_salida", message: SALIDA_NO_POSTERIOR_MESSAGE };
  }
  return null;
};

/** Esquema del diálogo "Corregir" (ver `getCorrectionTimesError`). */
export const createAttendanceCorrectionSchema = (context: AttendanceCorrectionContext) =>
  AttendanceCorrectionObject.superRefine((values, ctx) => {
    const error = getCorrectionTimesError(values, context);
    if (error) {
      ctx.addIssue({ code: "custom", path: [error.field], message: error.message });
    }
  });

export type CheckInTimeValues = { hora: string };

/**
 * Esquema del diálogo de checada con hora (días pasados). `after` es la entrada
 * ya guardada cuando se registra una SALIDA: la salida debe ser posterior. Se
 * compara contra el datetime completo guardado (con segundos), igual que el
 * servidor. Para una entrada no hay límite (el empleado no tiene registro ese
 * día).
 */
export const createCheckInTimeSchema = (fecha: string, after: StoredTime | null) =>
  z
    .object({
      hora: z.string().min(1, HORA_REQUERIDA_MESSAGE).refine(isHHMM, HORA_INVALIDA_MESSAGE),
    })
    .superRefine((values, ctx) => {
      if (!after?.iso || !isHHMM(values.hora)) {
        return;
      }
      const entrada = Date.parse(after.iso);
      const iso = toMexicoIsoDateTime(fecha, values.hora);
      if (iso && !Number.isNaN(entrada) && Date.parse(iso) <= entrada) {
        ctx.addIssue({
          code: "custom",
          path: ["hora"],
          message: `La hora de salida debe ser posterior a la de entrada (${after.hhmm}).`,
        });
      }
    });
