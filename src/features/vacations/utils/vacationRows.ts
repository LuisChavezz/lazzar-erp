import type { User } from "@/src/features/users/interfaces/user.interface";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import type { Vacation } from "../interfaces/vacation.interface";
import type { VacationRow } from "../components/VacationColumns";
import type { EstadoVacacion } from "../constants/vacationChoices";
import { VACATION_STALE_MESSAGES } from "../hooks/vacationErrorMessages";

/**
 * Filas de la tabla: cada solicitud con los nombres de sus FK resueltos. Un
 * empleado que no está en el catálogo (o cuyo catálogo no ha llegado) se
 * rotula `Empleado #N`, una sola vez: la celda, la búsqueda y el orden leen
 * ese mismo texto (ver `VacationRow`).
 */
export const buildVacationRows = (
  vacations: readonly Vacation[],
  employeeNameById: ReadonlyMap<number, string>,
  usersById: Map<number, User> | null,
  isUsersError: boolean
): VacationRow[] =>
  vacations.map((vacation) => ({
    ...vacation,
    empleado_nombre: employeeNameById.get(vacation.empleado) ?? `Empleado #${vacation.empleado}`,
    solicitado_por_nombre: resolveUserName(vacation.solicitado_por, usersById, isUsersError),
    autorizado_por_nombre: resolveUserName(vacation.autorizado_por, usersById, isUsersError),
    rechazado_por_nombre: resolveUserName(vacation.rechazado_por, usersById, isUsersError),
  }));

/**
 * ¿El diálogo de fila (aprobar, rechazar, eliminar) ya no aplica? Se cierra
 * con aviso si la solicitud desapareció del listado o ya no está en
 * `expectedEstado`: `pendiente` para aprobar y rechazar; el estado de APERTURA
 * para eliminar (una pendiente se borra con la confirmación simple, una
 * aprobada solo con la fuerte). Con la acción propia en vuelo (`isBusy`) no
 * aplica: el cambio de estado es el suyo y lo cierra su propio flujo.
 */
export const getVacationStaleNotice = (
  targetId: number | null,
  target: { estado: string } | null,
  expectedEstado: EstadoVacacion,
  isBusy: boolean
): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice<string>({
    resource: "vacation",
    targetId,
    target,
    expectedEstado,
    isBusy,
    messages: VACATION_STALE_MESSAGES,
  });
