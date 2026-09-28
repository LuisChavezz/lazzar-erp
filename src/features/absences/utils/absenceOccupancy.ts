import type {
  CalendarOccupancySource,
  CalendarOccupant,
} from "@/src/interfaces/hr-calendar.interface";
import type { Absence } from "../interfaces/absence.interface";
import { describeAusencia, ESTADOS_QUE_OCUPAN } from "../constants/absenceChoices";
import { getAbsencesByEmployee } from "../services/actions";

/** Identifica a los permisos y ausencias dentro del calendario común de RH. */
export const ABSENCE_OCCUPANCY_KIND = "absence";

/**
 * Traducción de un permiso/ausencia al calendario común, con las constantes de
 * este módulo: ocupan los pendientes y aprobados, y se nombran por tipo y
 * estado ("una incapacidad aprobada"). Igual desde este formulario que desde
 * el de vacaciones.
 */
export const toAbsenceOccupant = (absence: Absence): CalendarOccupant => ({
  kind: ABSENCE_OCCUPANCY_KIND,
  id: absence.id,
  empleado: absence.empleado,
  fecha_inicio: absence.fecha_inicio,
  fecha_fin: absence.fecha_fin,
  occupies: ESTADOS_QUE_OCUPAN.includes(absence.estado),
  description: describeAusencia(absence.tipo, absence.estado),
});

/** Fuente de ocupación de permisos y ausencias que el hub de RH reparte a otros formularios. */
export const absenceOccupancySource: CalendarOccupancySource = {
  kind: ABSENCE_OCCUPANCY_KIND,
  fetchByEmployee: async (empleado) =>
    (await getAbsencesByEmployee(empleado)).map(toAbsenceOccupant),
};
