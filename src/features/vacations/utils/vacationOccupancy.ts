import type {
  CalendarOccupancySource,
  CalendarOccupant,
} from "@/src/interfaces/hr-calendar.interface";
import type { Vacation } from "../interfaces/vacation.interface";
import { ESTADOS_QUE_OCUPAN, getEstadoVacacionLabel } from "../constants/vacationChoices";
import { getVacationsByEmployee } from "../services/actions";

/** Identifica a las vacaciones dentro del calendario común de RH. */
export const VACATION_OCCUPANCY_KIND = "vacation";

/** "pendiente" / "aprobada" / "rechazada", con las etiquetas de este módulo. */
const estadoWord = (vacation: Vacation) =>
  (getEstadoVacacionLabel(vacation.estado) ?? vacation.estado).toLowerCase();

const toOccupant = (vacation: Vacation, description: string): CalendarOccupant => ({
  kind: VACATION_OCCUPANCY_KIND,
  id: vacation.id,
  empleado: vacation.empleado,
  fecha_inicio: vacation.fecha_inicio,
  fecha_fin: vacation.fecha_fin,
  occupies: ESTADOS_QUE_OCUPAN.includes(vacation.estado),
  description,
});

/**
 * Vista desde el PROPIO formulario de vacaciones: "otra solicitud pendiente".
 * Produce exactamente el mensaje de siempre del traslape entre vacaciones.
 */
export const toOwnVacationOccupant = (vacation: Vacation) =>
  toOccupant(vacation, `otra solicitud ${estadoWord(vacation)}`);

/** Vista desde OTRO recurso: "una solicitud de vacaciones aprobada". */
export const toVacationOccupant = (vacation: Vacation) =>
  toOccupant(vacation, `una solicitud de vacaciones ${estadoWord(vacation)}`);

/** Fuente de ocupación de vacaciones que el hub de RH reparte a otros formularios. */
export const vacationOccupancySource: CalendarOccupancySource = {
  kind: VACATION_OCCUPANCY_KIND,
  fetchByEmployee: async (empleado) =>
    (await getVacationsByEmployee(empleado)).map(toVacationOccupant),
};
