import { z } from "zod";
import { isHHMM, toMexicoIsoDateTime } from "@/src/utils/mexicoTime";
import {
  HORA_INEXISTENTE_MESSAGE,
  HORA_INVALIDA_MESSAGE,
  type StoredTime,
} from "@/src/utils/timeInput";
import { TIPO_CONTROL_HORAS_VALUES } from "../constants/timeTrackingChoices";
import {
  describeInterval,
  findOverlap,
  instantToDateKey,
  instantToHHMM,
  parseInstant,
  type SegmentInterval,
} from "../utils/segmentTime";

/**
 * Reglas del tramo. El backend no valida coherencia, traslapes ni límites
 * (solo que el fin no sea anterior al inicio), así que todas viven aquí. Las
 * horas se capturan como "HH:MM" sobre la `fecha` de la asistencia y se
 * comparan como INSTANTES.
 */

export const HORA_OTRO_DIA_MESSAGE =
  "La hora guardada es de otro día: captúrala de nuevo sobre el día de la asistencia.";
export const FIN_NO_POSTERIOR_MESSAGE =
  "La hora de fin debe ser posterior a la de inicio (un tramo no puede cruzar la medianoche).";

const requiredTime = (requiredMessage: string) =>
  z.string().min(1, requiredMessage).refine(isHHMM, HORA_INVALIDA_MESSAGE);

const TimeSegmentObject = z.object({
  hora_inicio: requiredTime("La hora de inicio es requerida"),
  // Solo tramos CERRADOS: el fin es obligatorio en el cliente.
  hora_fin: requiredTime("La hora de fin es requerida"),
  tipo: z.enum(TIPO_CONTROL_HORAS_VALUES),
  /** `op_id` como string, o "" para "Sin OP". */
  op: z.string(),
  descripcion: z.string(),
});

/** Schema de un solo campo, para la validación en blur (un refinamiento ya no expone `.shape`). */
export const TimeSegmentFields = TimeSegmentObject.shape;

export type TimeSegmentValues = z.infer<typeof TimeSegmentObject>;

export type TimeSegmentField = keyof TimeSegmentValues;

export type TimeSegmentTimeField = "hora_inicio" | "hora_fin";

/**
 * Todo lo que las reglas necesitan saber de la asistencia y sus tramos. Se
 * arma en CADA render con la asistencia y el listado vigentes, así que los
 * límites y los traslapes nunca son los de la apertura del formulario.
 */
export interface TimeSegmentContext {
  /** Día de la asistencia: las horas capturadas se anclan a él. */
  fecha: string;
  /** Entrada truncada al minuto. */
  entryMs: number;
  /** Salida exacta, o `null` (sin límite superior). */
  exitMs: number | null;
  /** Los OTROS tramos de la asistencia (sin el que se edita). */
  siblings: readonly SegmentInterval[];
  /**
   * Horas guardadas del tramo que se edita que la persona NO ha tocado. Un
   * campo tocado no aparece: se reconstruye siempre desde `fecha` + "HH:MM",
   * aunque el texto sea igual al guardado. Vacío en un alta.
   */
  stored: Partial<Record<TimeSegmentTimeField, StoredTime>>;
}

export type ResolvedTime = { ms: number; iso: string } | { error: string };

/**
 * Instante e ISO que tendrá una hora al guardar, o `null` si todavía no es
 * una hora válida (eso lo reporta la validación del campo):
 * - Sin tocar al editar: la GUARDADA, con sus segundos; así se reenvía sin
 *   truncarse. Si cae en otro día, error: el tramo no puede cruzar la
 *   medianoche.
 * - Tocada (aunque se reescriba el mismo texto) o en un alta: "HH:MM:00"
 *   sobre `fecha` en hora de México. Así un tramo guardado en otro día se
 *   corrige volviendo a escribir la misma hora.
 */
export const resolveSegmentTime = (
  field: TimeSegmentTimeField,
  values: Pick<TimeSegmentValues, TimeSegmentTimeField>,
  context: TimeSegmentContext
): ResolvedTime | null => {
  const value = values[field];
  if (!isHHMM(value)) {
    return null;
  }
  const stored = context.stored[field];
  if (stored?.iso) {
    const ms = parseInstant(stored.iso);
    if (ms !== null) {
      return instantToDateKey(ms) === context.fecha
        ? { ms, iso: stored.iso }
        : { error: HORA_OTRO_DIA_MESSAGE };
    }
  }
  const iso = toMexicoIsoDateTime(context.fecha, value);
  return iso ? { ms: Date.parse(iso), iso } : { error: HORA_INEXISTENTE_MESSAGE };
};

const msOf = (resolved: ResolvedTime | null): number | null =>
  resolved && "ms" in resolved ? resolved.ms : null;

/** Instantes de inicio y fin que tendría el tramo, o `null` en la hora que aún no resuelve. */
export const resolveSegmentInstants = (
  values: Pick<TimeSegmentValues, TimeSegmentTimeField>,
  context: TimeSegmentContext
) => ({
  startMs: msOf(resolveSegmentTime("hora_inicio", values, context)),
  endMs: msOf(resolveSegmentTime("hora_fin", values, context)),
});

/**
 * Regla cruzada de horas, como función pura: la usan el refinamiento de abajo
 * y el formulario, que la reevalúa cuando cambia la otra hora. Devuelve el
 * campo y el mensaje del PRIMER error, o `null`:
 *
 * 1. Cada hora debe existir ese día (y la guardada, ser de ese día).
 * 2. Inicio a partir de la entrada (truncada al minuto).
 * 3. Fin estrictamente posterior al inicio: un tramo de duración cero no vale
 *    y, al anclarse ambas horas al mismo día, tampoco puede cruzar la
 *    medianoche.
 * 4. Fin a más tardar a la salida, si la hay.
 * 5. Sin traslape con los otros tramos (tocarse en un extremo sí vale; uno
 *    guardado sin fin cuenta como abierto).
 */
export const getSegmentTimesError = (
  values: Pick<TimeSegmentValues, TimeSegmentTimeField>,
  context: TimeSegmentContext
): { field: TimeSegmentTimeField; message: string } | null => {
  const start = resolveSegmentTime("hora_inicio", values, context);
  const end = resolveSegmentTime("hora_fin", values, context);

  if (start && "error" in start) {
    return { field: "hora_inicio", message: start.error };
  }
  if (end && "error" in end) {
    return { field: "hora_fin", message: end.error };
  }
  if (start && start.ms < context.entryMs) {
    return {
      field: "hora_inicio",
      message: `El tramo no puede iniciar antes de la entrada (${instantToHHMM(context.entryMs)}).`,
    };
  }
  if (!start || !end) {
    return null;
  }
  if (end.ms <= start.ms) {
    return { field: "hora_fin", message: FIN_NO_POSTERIOR_MESSAGE };
  }
  if (context.exitMs !== null && end.ms > context.exitMs) {
    return {
      field: "hora_fin",
      message: `El tramo no puede terminar después de la salida (${instantToHHMM(context.exitMs)}).`,
    };
  }
  const overlap = findOverlap(start.ms, end.ms, context.siblings);
  if (overlap) {
    return {
      field: "hora_inicio",
      message: `El tramo se traslapa con el de ${describeInterval(overlap)}.`,
    };
  }
  return null;
};

/** Esquema del formulario de tramo (ver `getSegmentTimesError`). */
export const createTimeSegmentSchema = (context: TimeSegmentContext) =>
  TimeSegmentObject.superRefine((values, ctx) => {
    const error = getSegmentTimesError(values, context);
    if (error) {
      ctx.addIssue({ code: "custom", path: [error.field], message: error.message });
    }
  });
