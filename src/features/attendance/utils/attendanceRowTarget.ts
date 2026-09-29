import type { AttendanceRow, RollCallRow } from "./attendanceRows";

/**
 * A QUÉ fila apunta una mutación de asistencia. Viaja en las variables de TODAS
 * las mutaciones del módulo (`{ target, ... }`) para que el "en vuelo" por fila
 * (`usePendingAttendanceTargets`) funcione igual con y sin registro:
 *
 * - En el pase de lista, una fila sin registro se identifica por empleado y
 *   día (la checada o la falta todavía no tiene `id`).
 * - Una fila con registro también tiene su `id`.
 *
 * Como `(empleado, fecha)` es único en el backend, empleado + día identifica la
 * fila en ambas vistas.
 */
export interface AttendanceRowTarget {
  empleado: number;
  fecha: string;
  id: number | null;
}

/**
 * Destino de una mutación a partir de lo que tiene la vista: un registro (con
 * `id`) o una fila del pase de lista (con o sin registro).
 */
export function targetOf(record: AttendanceRow): AttendanceRowTarget & { id: number };
export function targetOf(row: RollCallRow): AttendanceRowTarget;
export function targetOf(source: AttendanceRow | RollCallRow): AttendanceRowTarget {
  return {
    empleado: source.empleado,
    fecha: source.fecha,
    id: "record" in source ? (source.record?.id ?? null) : source.id,
  };
}

/** ¿Hay una mutación en vuelo sobre el día de ese empleado? */
export const isEmployeeDayBusy = (
  pending: readonly AttendanceRowTarget[],
  empleado: number,
  fecha: string
): boolean => pending.some((target) => target.empleado === empleado && target.fecha === fecha);
