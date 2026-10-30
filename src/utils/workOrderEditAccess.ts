import {
  getCompanyAdminStatus,
  type CompanyAdminFlags,
} from "@/src/features/users/utils/companyAdminStatus";

/** Lo que la ficha necesita saber del usuario de la sesión. */
export interface WorkOrderEditUser extends CompanyAdminFlags {
  permissions?: string[];
}

/**
 * ¿Puede el usuario editar estatus, prioridad y observaciones en la ficha de
 * una orden de reflejante (`R-PRODUCCION-OR`) o de corte de manga
 * (`R-PRODUCCION-CM`)?
 *
 * APROXIMA el gate del backend (`_require_produccion`, nucleo-erp #786), que
 * responde `400 {"permiso": [...]}` a quien no sea superusuario, admin de
 * empresa o de un rol del departamento PRODUCCION. Ese departamento no viaja
 * en la sesión, así que aquí se usa el código de la ruta, que hoy solo tiene
 * el rol Producción. No es equivalente: quien reciba el código por un permiso
 * directo o por un rol de otro departamento verá la ficha editable y el
 * backend le rechazará cada cambio (riesgo aceptado: hoy no hay ningún caso).
 *
 * NO usa `hasPermission`: su atajo para el rol "admin" también cubre a
 * `is_staff` (`es_admin`), al que el backend rechaza. Superusuario y admin de
 * empresa se resuelven con `getCompanyAdminStatus` (la regla de
 * `useCompanyAdminStatus`), porque el backend les manda `permisos` vacío. Una
 * sesión anterior a esas banderas es `unknown` y aquí falla cerrado: la ficha
 * queda de solo lectura hasta volver a iniciar sesión.
 */
export const canEditWorkOrder = (
  user: WorkOrderEditUser | null | undefined,
  routePermission: string,
): boolean => {
  if (!user) return false;
  if (getCompanyAdminStatus(user) === "admin") return true;
  return (user.permissions ?? []).includes(routePermission);
};
