import { z } from "zod";
import { getLocalTodayDate } from "@/src/utils/formatDate";
import type { CalendarOccupant } from "@/src/interfaces/hr-calendar.interface";
import { calendarConflictMessage, findCalendarConflict } from "@/src/utils/hrCalendarOverlap";
import type { Absence } from "../interfaces/absence.interface";
import { TIPO_AUSENCIA_VALUES, TIPO_FALTA_INJUSTIFICADA } from "../constants/absenceChoices";
import { ABSENCE_OCCUPANCY_KIND, toAbsenceOccupant } from "../utils/absenceOccupancy";

/**
 * Objeto base SIN las reglas cruzadas. Se exporta aparte porque `validateField`
 * (en blur) necesita el schema de UN campo vía `.shape`, que un refinamiento de
 * objeto ya no expone. Mismo desdoblamiento que en vacaciones.
 *
 * `empleado` usa 0 como centinela de "Seleccionar...".
 */
const AbsenceFormObject = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  tipo: z.enum(TIPO_AUSENCIA_VALUES, "El tipo es requerido"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  fecha_fin: z.string().min(1, "La fecha de fin es requerida"),
  con_goce_sueldo: z.boolean(),
  motivo: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const AbsenceFormFields = AbsenceFormObject.shape;

export type AbsenceFormValues = z.infer<typeof AbsenceFormObject>;

/**
 * Lo que las reglas cruzadas necesitan además de los valores: los permisos
 * contra los que se evalúa el traslape (D3), el id en edición (se excluye) y la
 * ocupación de los OTROS recursos del empleado (vacaciones), ya traducida por
 * su módulo.
 */
export interface AbsenceRuleContext {
  absences: readonly Absence[];
  editingId: number | null;
  foreignOccupants: readonly CalendarOccupant[];
}

export const FECHA_FIN_ANTERIOR_MESSAGE = "La fecha de fin no puede ser anterior a la de inicio.";
export const FALTA_FUTURA_MESSAGE =
  "Una falta injustificada no puede terminar después de hoy: solo se registran faltas ya ocurridas.";

/**
 * Reglas de `fecha_fin`, como función pura: la usan el refinamiento, el
 * formulario (que la reevalúa al cambiar `empleado`, `tipo` o `fecha_inicio`)
 * y la guarda previa a escribir, con datos frescos del servidor.
 *
 * 1. No puede ser anterior a `fecha_inicio` (mismo texto que el backend).
 * 2. Una falta injustificada no puede terminar después de hoy (D2).
 * 3. No puede traslaparse con otro permiso pendiente/aprobado del empleado,
 *    ni con unas vacaciones pendientes/aprobadas del empleado (D3), vía la
 *    regla común `findCalendarConflict`.
 *
 * `today` es inyectable para las pruebas; por defecto, el día LOCAL.
 */
export const getFechaFinError = (
  values: Pick<AbsenceFormValues, "empleado" | "tipo" | "fecha_inicio" | "fecha_fin">,
  context: AbsenceRuleContext,
  today: string = getLocalTodayDate()
): string | null => {
  if (!values.fecha_fin) {
    return null;
  }
  if (values.fecha_inicio && values.fecha_fin < values.fecha_inicio) {
    return FECHA_FIN_ANTERIOR_MESSAGE;
  }
  if (values.tipo === TIPO_FALTA_INJUSTIFICADA && values.fecha_fin > today) {
    return FALTA_FUTURA_MESSAGE;
  }
  if (!values.fecha_inicio || values.empleado <= 0) {
    return null;
  }

  const conflict =
    findCalendarConflict(
      values,
      context.absences.map(toAbsenceOccupant),
      context.editingId !== null ? { kind: ABSENCE_OCCUPANCY_KIND, id: context.editingId } : null
    ) ?? findCalendarConflict(values, context.foreignOccupants);
  return conflict ? calendarConflictMessage(conflict) : null;
};

/**
 * Schema completo con las reglas cruzadas. FACTORÍA porque el traslape
 * necesita los listados. Cada issue lleva `path` para que `validateForm` lo
 * asigne a su campo.
 */
export const createAbsenceFormSchema = (context: AbsenceRuleContext) =>
  AbsenceFormObject.superRefine((values, ctx) => {
    const fechaFinError = getFechaFinError(values, context);
    if (fechaFinError) {
      ctx.addIssue({ code: "custom", message: fechaFinError, path: ["fecha_fin"] });
    }
  });

/**
 * Rechazo o descarte: el motivo es obligatorio en el cliente aunque el backend
 * lo acepte vacío. `.trim()` antes de `.min(1)`.
 */
export const AbsenceRejectSchema = z.object({
  motivo_rechazo: z.string().trim().min(1, "El motivo es requerido"),
});
