import type { User } from "@/src/features/users/interfaces/user.interface";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import type { ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import type { Absence } from "../interfaces/absence.interface";
import type { AbsenceRow } from "../components/AbsenceColumns";
import {
  ESTADO_AUSENCIA_FILTER_OPTIONS,
  getTipoAusenciaLabel,
  type EstadoAusencia,
} from "../constants/absenceChoices";
import { ABSENCE_GONE_MESSAGE, absenceEstadoChangedMessage } from "../hooks/absenceErrorMessages";

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
  getTipoAusenciaLabel(tipo) ?? (tipo || "—");

/**
 * Opciones del filtro de estatus. El listado mezcla tipos y la etiqueta de un
 * estado depende del tipo ("Aprobado" / "Falta confirmada"), así que se usa
 * `ESTADO_AUSENCIA_FILTER_OPTIONS` tal cual, que nombra las dos variantes
 * ("Aprobado / falta confirmada"), y NO la etiqueta del badge de una fila.
 * Un código fuera del catálogo lo agrega `withHeaderFilters` al final, crudo.
 */
export const ABSENCE_ESTADO_FILTER_OPTIONS: ColumnFilterOption[] = ESTADO_AUSENCIA_FILTER_OPTIONS;

/**
 * ¿El diálogo de fila (aprobar/confirmar, rechazar/descartar, eliminar) ya no
 * aplica? Se cierra con aviso si el registro desapareció o ya no está en
 * `expectedEstado`: `pendiente` para resolverlo; el estado de APERTURA para
 * eliminar. El aviso nombra el estado con la etiqueta de su tipo. Con la
 * acción propia en vuelo (`isBusy`) no aplica.
 */
export const getAbsenceStaleNotice = (
  targetId: number | null,
  target: Pick<Absence, "tipo" | "estado"> | null,
  expectedEstado: EstadoAusencia,
  isBusy: boolean
): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice<string>({
    resource: "absence",
    targetId,
    target,
    expectedEstado,
    isBusy,
    messages: {
      gone: ABSENCE_GONE_MESSAGE,
      estadoChanged: (estado) => absenceEstadoChangedMessage(target?.tipo ?? "", estado),
    },
  });
