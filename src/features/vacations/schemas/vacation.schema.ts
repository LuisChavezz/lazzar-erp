import { z } from "zod";
import { formatLocalDate } from "@/src/utils/formatDate";
import type { Vacation } from "../interfaces/vacation.interface";
import { getEstadoVacacionLabel } from "../constants/vacationChoices";
import { countCalendarDays } from "../utils/workingDays";
import { findOverlappingVacation } from "../utils/findOverlappingVacation";

/**
 * Objeto base SIN las reglas cruzadas.
 *
 * Se exporta aparte porque `validateForm` valida el objeto completo mientras
 * que `validateField` (en blur) necesita el schema de UN campo vía `.shape`, y
 * un refinamiento de objeto ya no expone `.shape`. Mismo desdoblamiento que en
 * evaluaciones e incidencias.
 *
 * `empleado` usa 0 como centinela de "Seleccionar...". `dias_solicitados` se
 * guarda como el texto crudo del input (igual que `puntaje` en evaluaciones):
 * su regla depende de las fechas y vive en el refinamiento.
 */
const VacationFormObject = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  fecha_fin: z.string().min(1, "La fecha de fin es requerida"),
  dias_solicitados: z.string(),
  motivo: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const VacationFormFields = VacationFormObject.shape;

export type VacationFormValues = z.infer<typeof VacationFormObject>;

/**
 * Lo que las reglas cruzadas necesitan además de los valores del form: el
 * listado COMPLETO de solicitudes (traslape) y el id en edición (se excluye).
 */
export interface VacationRuleContext {
  vacations: readonly Vacation[];
  editingId: number | null;
}

export const FECHA_FIN_ANTERIOR_MESSAGE = "La fecha de fin no puede ser anterior a la de inicio.";
export const DIAS_REQUERIDOS_MESSAGE = "Los días solicitados son requeridos";
export const DIAS_ENTERO_MESSAGE = "Captura un número entero de días, mínimo 1";

/**
 * Reglas de `fecha_fin`, como función pura: la usan el refinamiento de abajo y
 * `useVacationForm`, que la reevalúa cuando cambian `empleado` o `fecha_inicio`.
 *
 * 1. No puede ser anterior a `fecha_inicio` (mismo texto que el backend).
 * 2. El periodo no puede traslaparse con otra solicitud pendiente o aprobada
 *    del mismo empleado (D6). Solo se evalúa con un rango válido.
 */
export const getFechaFinError = (
  values: Pick<VacationFormValues, "empleado" | "fecha_inicio" | "fecha_fin">,
  context: VacationRuleContext
): string | null => {
  if (!values.fecha_inicio || !values.fecha_fin) {
    return null;
  }
  if (values.fecha_fin < values.fecha_inicio) {
    return FECHA_FIN_ANTERIOR_MESSAGE;
  }
  if (values.empleado <= 0) {
    return null;
  }

  const overlapping = findOverlappingVacation(values, context.vacations, context.editingId);
  if (!overlapping) {
    return null;
  }
  const estado = (getEstadoVacacionLabel(overlapping.estado) ?? overlapping.estado).toLowerCase();
  return `El periodo se traslapa con otra solicitud ${estado} de este empleado (del ${formatLocalDate(
    overlapping.fecha_inicio
  )} al ${formatLocalDate(overlapping.fecha_fin)}).`;
};

/**
 * Regla de `dias_solicitados` (D1): entero de 1 hasta los días CALENDARIO del
 * rango. Sin rango válido no hay tope que comparar (el error vive en las
 * fechas).
 */
export const getDiasSolicitadosError = (
  values: Pick<VacationFormValues, "dias_solicitados" | "fecha_inicio" | "fecha_fin">
): string | null => {
  const raw = values.dias_solicitados.trim();
  if (!raw) {
    return DIAS_REQUERIDOS_MESSAGE;
  }
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    return DIAS_ENTERO_MESSAGE;
  }
  const calendarDays = countCalendarDays(values.fecha_inicio, values.fecha_fin);
  if (calendarDays !== null && Number(raw) > calendarDays) {
    return calendarDays === 1
      ? "No puede exceder 1 día: el periodo es de un solo día"
      : `No puede exceder los ${calendarDays} días calendario del periodo`;
  }
  return null;
};

/**
 * Schema completo con las reglas cruzadas. Es una FACTORÍA porque la regla de
 * traslape necesita el listado cargado. Cada issue lleva `path`: sin él
 * quedaría a nivel de objeto y `validateForm` —que lee `issue.path[0]`— lo
 * descartaría.
 */
export const createVacationFormSchema = (context: VacationRuleContext) =>
  VacationFormObject.superRefine((values, ctx) => {
    const fechaFinError = getFechaFinError(values, context);
    if (fechaFinError) {
      ctx.addIssue({ code: "custom", message: fechaFinError, path: ["fecha_fin"] });
    }

    const diasError = getDiasSolicitadosError(values);
    if (diasError) {
      ctx.addIssue({ code: "custom", message: diasError, path: ["dias_solicitados"] });
    }
  });

/**
 * Rechazo (D5): el motivo es obligatorio en el cliente aunque el backend lo
 * acepte vacío. `.trim()` va ANTES de `.min(1)`, así que solo espacios no
 * cuenta, y el valor que viaja ya va recortado.
 */
export const VacationRejectSchema = z.object({
  motivo_rechazo: z.string().trim().min(1, "El motivo de rechazo es requerido"),
});
