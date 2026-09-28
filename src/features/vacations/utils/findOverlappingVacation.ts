import type { Vacation } from "../interfaces/vacation.interface";
import { ESTADOS_QUE_OCUPAN } from "../constants/vacationChoices";

/**
 * Primera solicitud del MISMO empleado cuyo rango se traslapa con el
 * candidato, o `undefined`.
 *
 * - Solo cuentan las pendientes y las aprobadas (`ESTADOS_QUE_OCUPAN`); una
 *   rechazada ya no ocupa el calendario.
 * - `excludeId` excluye el registro que se está editando.
 * - Rangos cerrados en ambos extremos: comparten un día → se traslapan.
 *
 * Se evalúa contra el listado COMPLETO ya cargado, nunca con los filtros de
 * fecha del servidor, que son de contención y no detectan un traslape parcial.
 * Las fechas `"YYYY-MM-DD"` se comparan como texto: ese formato ordena igual
 * que la fecha.
 */
export const findOverlappingVacation = (
  candidate: { empleado: number; fecha_inicio: string; fecha_fin: string },
  vacations: readonly Vacation[],
  excludeId: number | null
): Vacation | undefined =>
  vacations.find(
    (vacation) =>
      vacation.id !== excludeId &&
      vacation.empleado === candidate.empleado &&
      ESTADOS_QUE_OCUPAN.includes(vacation.estado) &&
      vacation.fecha_inicio <= candidate.fecha_fin &&
      candidate.fecha_inicio <= vacation.fecha_fin
  );
