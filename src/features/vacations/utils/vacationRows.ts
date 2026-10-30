import type { User } from "@/src/features/users/interfaces/user.interface";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import type { Vacation } from "../interfaces/vacation.interface";
import type { VacationRow } from "../components/VacationColumns";

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
