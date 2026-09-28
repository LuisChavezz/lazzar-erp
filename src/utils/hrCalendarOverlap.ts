import { formatLocalDate } from "./formatDate";
import type { CalendarOccupant } from "../interfaces/hr-calendar.interface";

/**
 * Regla de traslape del calendario de RH, común a vacaciones y a permisos y
 * ausencias: el primer registro que OCUPA el calendario del MISMO empleado y
 * cuyo rango se cruza con el candidato, o `undefined`.
 *
 * - Solo cuentan los que `occupies` (lo decide el módulo dueño).
 * - `exclude` saca al registro que se está editando (mismo `kind` e `id`).
 * - Rangos cerrados: compartir un solo día ya es traslape. Las fechas
 *   `"YYYY-MM-DD"` se comparan como texto, que ordena igual que la fecha.
 *
 * Se evalúa contra datos en caché (aviso en blur) y contra datos frescos del
 * servidor (guarda previa a escribir); los filtros de fecha del backend son de
 * contención y no detectan un traslape parcial.
 */
export const findCalendarConflict = (
  candidate: { empleado: number; fecha_inicio: string; fecha_fin: string },
  occupants: readonly CalendarOccupant[],
  exclude: { kind: string; id: number } | null = null
): CalendarOccupant | undefined =>
  occupants.find(
    (occupant) =>
      occupant.occupies &&
      occupant.empleado === candidate.empleado &&
      !(exclude && occupant.kind === exclude.kind && occupant.id === exclude.id) &&
      occupant.fecha_inicio <= candidate.fecha_fin &&
      candidate.fecha_inicio <= occupant.fecha_fin
  );

/**
 * Mensaje de traslape: nombra el registro en conflicto (tipo y estado, vía su
 * `description`) y sus fechas, para que se sepa qué ajustar.
 */
export const calendarConflictMessage = (occupant: CalendarOccupant): string =>
  `El periodo se traslapa con ${occupant.description} de este empleado (del ${formatLocalDate(
    occupant.fecha_inicio
  )} al ${formatLocalDate(occupant.fecha_fin)}).`;
