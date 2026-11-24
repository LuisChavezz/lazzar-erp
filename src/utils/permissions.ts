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

/**
 * Requisito de una ruta o de una hoja de navegación: un código, o un ARREGLO
 * que se cumple con CUALQUIERA (la forma de `routePermissions`). Un código
 * suelto se evalúa exactamente como `hasPermission`.
 */
export type PermissionRequirement = string | string[];

/** Normaliza un requisito a la lista de códigos que lo satisfacen. */
export const permissionRequirementCodes = (requirement: PermissionRequirement): string[] =>
  Array.isArray(requirement) ? requirement : [requirement];

/** ¿Cumple `context` el requisito? Mismo cortocircuito de rol "admin". */
export function meetsPermissionRequirement(
  requirement: PermissionRequirement,
  context?: PermissionContext | null
) {
  return hasAnyPermission(permissionRequirementCodes(requirement), context);
}


/**
 * ¿Puede el usuario ejecutar las ACCIONES de Mesa de Control? (EC-943)
 *
 * El backend no gobierna esas acciones con códigos de permiso: exige ser
 * superusuario, admin de empresa o tener un rol activo de departamento
 * `MESACONTROL` en su empresa, y responde 400 `{ permiso }` si no. Esa misma
 * decisión llega en la sesión como `es_mesa_control` (EC-944), así que cuando
 * está se usa TAL CUAL —también un `false` que desmiente un código concedido—.
 *
 * Transición: una sesión emitida antes de EC-943 no la trae; entonces se
 * evalúa `fallbackPermission`, el código que gobernaba el control hasta ahora,
 * con el cortocircuito de rol "admin" de `hasPermission`. El siguiente inicio
 * de sesión trae la bandera.
 *
 * Solo para mostrar u ocultar controles de ACCIÓN: nunca para decidir qué
 * pantallas o filas se ven (la bandera es `true` para superusuario y admin de
 * empresa, a quienes la bandeja de Mesa de Control excluye a propósito).
 */
export function canActAsMesaControl(
  context: PermissionContext | null | undefined,
  fallbackPermission: string,
): boolean {
  if (typeof context?.es_mesa_control === "boolean") {
    return context.es_mesa_control;
  }
  return hasPermission(fallbackPermission, context);
}
