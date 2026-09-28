import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import type { Shift } from "@/src/features/shifts/interfaces/shift.interface";
import { parseDiasLaborales } from "@/src/features/shifts/constants/diasLaborales";
import { countWorkingDays } from "./workingDays";

/**
 * Sugerencia de `dias_solicitados` para un empleado y un rango: los días
 * laborales de su turno dentro del rango (festivos NO descontados).
 *
 * Devuelve POR QUÉ no hay sugerencia en vez de un simple `null`, para que el
 * formulario explique en su ayuda qué capturar a mano.
 */
export type DiasSuggestion =
  /** Falta el empleado o alguna fecha, o `fecha_fin` es anterior. */
  | { status: "incomplete" }
  /** El empleado no tiene turno asignado (`turno` es opcional). */
  | { status: "no-shift" }
  /** El turno del empleado no está en el catálogo (cargando, caído o ajeno). */
  | { status: "shift-unavailable" }
  /** El turno existe pero `dias_laborales` no trae ningún código reconocible. */
  | { status: "unparsed-shift"; shift: Shift }
  | { status: "ok"; dias: number; shift: Shift; diasLaborales: string[] };

export const suggestDiasSolicitados = ({
  employee,
  shifts,
  fechaInicio,
  fechaFin,
}: {
  employee: Employee | undefined;
  shifts: Shift[];
  fechaInicio: string;
  fechaFin: string;
}): DiasSuggestion => {
  if (!employee || !fechaInicio || !fechaFin) {
    return { status: "incomplete" };
  }
  if (employee.turno === null) {
    return { status: "no-shift" };
  }

  const shift = shifts.find((candidate) => candidate.id === employee.turno);
  if (!shift) {
    return { status: "shift-unavailable" };
  }

  // El parser canónico de `shifts` ya lee el formato heredado "L,M,M,J,V"
  // como lunes a viernes; la ayuda del campo muestra los días interpretados.
  const diasLaborales = parseDiasLaborales(shift.dias_laborales);
  if (diasLaborales.length === 0) {
    return { status: "unparsed-shift", shift };
  }

  const dias = countWorkingDays(fechaInicio, fechaFin, diasLaborales);
  if (dias === null) {
    return { status: "incomplete" };
  }
  return { status: "ok", dias, shift, diasLaborales };
};

/**
 * Valor con el que se PRELLENA el campo: la sugerencia, o vacío cuando no la
 * hay o es 0 (un rango que cae entero en días de descanso). Vacío en vez de
 * conservar el número anterior, que correspondía a otro empleado o rango.
 */
export const toPrefillValue = (suggestion: DiasSuggestion): string =>
  suggestion.status === "ok" && suggestion.dias > 0 ? String(suggestion.dias) : "";
