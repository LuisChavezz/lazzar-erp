import type { User } from "@/src/features/users/interfaces/user.interface";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import type { Absence } from "../interfaces/absence.interface";
import type { AbsenceRow } from "../components/AbsenceColumns";
import { getTipoAusenciaLabel } from "../constants/absenceChoices";
import { catalogText } from "@/src/utils/catalogText";

/**
 * Filas de la tabla: cada registro con los nombres de sus FK resueltos. Un
 * empleado que no está en el catálogo (o cuyo catálogo no ha llegado) se
 * rotula `Empleado #N`, una sola vez: la celda, la búsqueda y el orden leen
 * ese mismo texto (ver `AbsenceRow`).
 */
export const buildAbsenceRows = (
  absences: readonly Absence[],
  employeeNameById: ReadonlyMap<number, string>,
  usersById: Map<number, User> | null,
  isUsersError: boolean
): AbsenceRow[] =>
  absences.map((absence) => ({
    ...absence,
    empleado_nombre: employeeNameById.get(absence.empleado) ?? `Empleado #${absence.empleado}`,
    solicitado_por_nombre: resolveUserName(absence.solicitado_por, usersById, isUsersError),
    autorizado_por_nombre: resolveUserName(absence.autorizado_por, usersById, isUsersError),
    rechazado_por_nombre: resolveUserName(absence.rechazado_por, usersById, isUsersError),
  }));

/**
 * Texto del `tipo` en la celda (y en la búsqueda y el orden): la etiqueta del
 * catálogo o, si el backend manda un código que el catálogo no conoce, el
 * código crudo — el mismo texto que su opción de filtro.
 */
export const getAbsenceTipoText = (tipo: string | null | undefined): string =>
  catalogText(getTipoAusenciaLabel(tipo), tipo);
