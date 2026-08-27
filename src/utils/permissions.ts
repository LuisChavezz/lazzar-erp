import { PermissionContext } from "../interfaces/permission-context.interface";


export function hasPermission(requiredPermission: string, context?: PermissionContext | null) {
  if (!requiredPermission) {
    return false;
  }
  const isAdmin = context?.role === "admin";
  if (isAdmin) {
    return true;
  }
  const permissions = context?.permissions ?? [];
  return permissions.includes(requiredPermission);
}

/**
 * ¿Tiene el usuario ALGUNO de los permisos indicados?
 *
 * Pensado para los puntos de ENTRADA a un módulo (tarjeta de Home, item del
 * sidebar): tras la granularización, un usuario puede tener solo una sección
 * (p. ej. `R-CRM-CLIENTES`) sin el permiso de módulo (`R-CRM`). Exigir el de
 * módulo lo dejaría sin ningún enlace para llegar a la sección a la que sí
 * tiene acceso. Delega en `hasPermission`, así que conserva el cortocircuito
 * del rol "admin".
 */
export function hasAnyPermission(
  requiredPermissions: string[],
  context?: PermissionContext | null
) {
  return requiredPermissions.some((permission) => hasPermission(permission, context));
}

