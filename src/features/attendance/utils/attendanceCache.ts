import type { Attendance, AttendanceListParams } from "../interfaces/attendance.interface";

/**
 * ¿Las filas de un listado con estos filtros incluyen un registro de `fecha`?
 * Mismo criterio que el filtro del servidor: `fecha` exacta, o `fecha__gte` +
 * `fecha__lte` inclusivos (fechas ISO, comparables como texto). Un listado sin
 * filtro de fecha nunca se consulta (`useAttendance`): no se toca.
 */
export const attendanceParamsInclude = (params: unknown, fecha: string): boolean => {
  if (typeof params !== "object" || params === null) return false;
  const { fecha: exacta, fecha__gte: desde, fecha__lte: hasta } = params as AttendanceListParams;
  if (exacta) return exacta === fecha;
  if (desde && hasta) return desde <= fecha && fecha <= hasta;
  return false;
};

/**
 * ¿La respuesta del alta tiene lo mínimo para escribirse en un listado? `id`
 * entero, `fecha` ISO y `estado`; si no, no se escribe (EC-927, best-effort).
 */
export const isAttendanceRecord = (value: unknown): value is Attendance => {
  if (typeof value !== "object" || value === null) return false;
  const { id, fecha, estado } = value as Partial<Attendance>;
  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    typeof fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    typeof estado === "string"
  );
};

/**
 * Inserta el registro en un listado en caché, o lo reemplaza si ya está (mismo
 * `id`). Al insertar, respeta el orden del endpoint (`-fecha`): va antes del
 * primer registro de una fecha anterior. Devuelve la MISMA referencia si
 * `rows` no es un arreglo.
 */
export const upsertAttendanceRow = (rows: unknown, record: Attendance): unknown => {
  if (!Array.isArray(rows)) return rows;
  const current = rows as Attendance[];
  if (current.some((row) => row.id === record.id)) {
    return current.map((row) => (row.id === record.id ? record : row));
  }
  const index = current.findIndex((row) => row.fecha < record.fecha);
  return index < 0
    ? [...current, record]
    : [...current.slice(0, index), record, ...current.slice(index)];
};

