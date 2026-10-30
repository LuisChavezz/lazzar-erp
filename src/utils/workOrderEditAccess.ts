/** Lo que la ficha necesita saber del usuario de la sesión. */
export interface WorkOrderEditUser {
  permissions?: string[];
  is_admin_empresa?: boolean;
  is_superuser?: boolean;
}

/**
 * ¿Puede el usuario editar estatus, prioridad y observaciones en la ficha de
 * una orden de reflejante (`R-PRODUCCION-OR`) o de corte de manga
 * (`R-PRODUCCION-CM`)?
 *
 * Reproduce el gate del backend (`_require_produccion`, nucleo-erp #786), que
 * responde `400 {"permiso": [...]}` a quien no sea superusuario, admin de
 * empresa o de un rol del departamento Producción. Ese departamento no viaja
 * en la sesión; su equivalente es el código de la ruta, que hoy solo tiene el
 * rol Producción.
 *
 * NO usa `hasPermission`: su atajo para el rol "admin" también cubre a
 * `is_staff` (`es_admin`), al que el backend rechaza. Y superusuario y admin
 * de empresa se leen de sus banderas porque el backend les manda `permisos`
 * vacío. Una sesión anterior a esas banderas (`undefined`) falla cerrado: la
 * ficha queda de solo lectura hasta volver a iniciar sesión.
 */
export const canEditWorkOrder = (
  user: WorkOrderEditUser | null | undefined,
  routePermission: string,
): boolean => {
  if (!user) return false;
  if (user.is_superuser === true || user.is_admin_empresa === true) return true;
  return (user.permissions ?? []).includes(routePermission);
};
