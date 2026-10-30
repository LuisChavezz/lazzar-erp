import type { User } from "@/src/features/users/interfaces/user.interface";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogMessages,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import type { Incident } from "../interfaces/incident.interface";
import type { IncidentRow } from "../components/IncidentColumns";
import {
  getEstadoIncidenciaLabel,
  getGravedadIncidenciaLabel,
  getTipoIncidenciaLabel,
} from "../constants/incidentChoices";
import { catalogText } from "@/src/utils/catalogText";

/**
 * Filas de la tabla: cada incidencia con los nombres de sus dos FK resueltos.
 * Un empleado que no está en el catálogo (o cuyo catálogo no ha llegado) se
 * rotula `Empleado #N`, una sola vez: la celda, la búsqueda y el orden leen
 * ese mismo texto (ver `IncidentRow`). El reportante SIEMPRE es string: sin
 * reportante (`null`) → "—".
 */
export const buildIncidentRows = (
  incidents: readonly Incident[],
  employeeNameById: ReadonlyMap<number, string>,
  usersById: Map<number, User> | null,
  isUsersError: boolean,
): IncidentRow[] =>
  incidents.map((incident) => ({
    ...incident,
    empleado_nombre: employeeNameById.get(incident.empleado) ?? `Empleado #${incident.empleado}`,
    reportado_por_nombre: resolveUserName(incident.reportado_por, usersById, isUsersError) ?? "—",
  }));

/**
 * Texto de cada catálogo en la celda (y en la búsqueda y el orden): la
 * etiqueta o, si el backend manda un código que el catálogo no conoce, el
 * código crudo — el mismo texto que pinta su badge y que rotula su opción de
 * filtro. "—" sin valor.
 */
export const getIncidentTipoText = (tipo: string | null | undefined): string =>
  catalogText(getTipoIncidenciaLabel(tipo), tipo);

export const getIncidentGravedadText = (gravedad: string | null | undefined): string =>
  catalogText(getGravedadIncidenciaLabel(gravedad), gravedad);

export const getIncidentEstadoText = (estado: string | null | undefined): string =>
  catalogText(getEstadoIncidenciaLabel(estado), estado);

/** Avisos del diálogo de baja/reactivación que se cerró por un cambio externo. */
export const INCIDENT_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "La incidencia ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El registro de la incidencia cambió: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`,
};

/**
 * ¿La confirmación de baja o reactivación de `targetId` ya no aplica? El
 * toggle recorre `activo` en los DOS sentidos, así que la acción espera el
 * `activo` con que se ABRIÓ la confirmación (`true` = dar de baja, `false` =
 * reactivar): si otra persona ya lo cambió, confirmar invertiría su cambio.
 * Solo cuenta `activo`; el `estado` de negocio (abierto/cerrado) no toca este
 * diálogo. `null` = el diálogo sigue.
 */
export const getStaleIncidentToggleNotice = (args: {
  targetId: number | null;
  target: Pick<IncidentRow, "activo"> | null;
  expectedActivo: boolean;
  isBusy: boolean;
}): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice({ resource: "incident", messages: INCIDENT_STALE_MESSAGES, ...args });
