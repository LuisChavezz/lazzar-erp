import {
  getCompanyAdminStatus,
  type CompanyAdminFlags,
} from "@/src/features/users/utils/companyAdminStatus";

/** Lo que la ficha necesita saber del usuario de la sesión. */
export interface WorkOrderEditUser extends CompanyAdminFlags {
  permissions?: string[];
}

/**
 * ¿Puede el usuario editar estatus, prioridad y observaciones, y registrar o
 * borrar avances, en la ficha de una orden de reflejante (`E-PRODUCCION-OR`)
 * o de corte de manga (`E-PRODUCCION-CM`)?
 *
 * Es el código de EDICIÓN de la sección, el que el backend exigirá en esas
 * escrituras (EC-899). Hasta que lo haga, el `PATCH` y los avances siguen
 * autorizándose por departamento (`_require_produccion`, nucleo-erp #786), que
 * responde `400 {"permiso": [...]}` a quien no sea superusuario, admin de
 * empresa o de un rol del departamento PRODUCCION; hoy el único rol con los
 * `E-` es el de Producción, así que ambas reglas coinciden (EC-895).
 *
 * NO usa `hasPermission`, que decide con el rol de la sesión. El `jwt` de
 * NextAuth recalcula ese rol en cada lectura, pero solo si el token trae las
 * dos banderas; una sesión sin ellas (anterior a que se guardaran) conserva el
 * rol con que se emitió, que antes de EC-673 era "admin" también para
 * `is_staff`, al que el backend rechaza. Por eso superusuario y admin de
 * empresa se resuelven con `getCompanyAdminStatus` (la regla de
 * `useCompanyAdminStatus`; el backend les manda `permisos` vacío): esa sesión
 * es `unknown` y aquí falla cerrado, la ficha queda de solo lectura hasta
 * volver a iniciar sesión.
 */
export const canEditWorkOrder = (
  user: WorkOrderEditUser | null | undefined,
  editPermission: string,
): boolean => {
  if (!user) return false;
  if (getCompanyAdminStatus(user) === "admin") return true;
  return (user.permissions ?? []).includes(editPermission);
};
