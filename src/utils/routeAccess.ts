import { routePermissions } from "../constants/routePermissions";
import type { PermissionContext } from "../interfaces/permission-context.interface";
import { hasAnyPermission, type PermissionRequirement } from "./permissions";
import { matchesRoutePrefix } from "./matchesRoutePrefix";

/**
 * Regla de `routePermissions` que gobierna `pathname`, con la MISMA búsqueda
 * que el proxy: la primera cuyo `prefix` coincide exacto o como segmento
 * (`prefix/`). `undefined` si la ruta no tiene regla.
 */
export function findRoutePermissionRule(pathname: string) {
  return routePermissions.find(
    ({ prefix }) => matchesRoutePrefix(pathname, prefix),
  );
}

/**
 * Requisito de permiso de `pathname` según el proxy: el `permission` de la
 * regla de `findRoutePermissionRule` (un código, o un arreglo que se cumple con
 * CUALQUIERA). `undefined` si la ruta no tiene regla. Es la ÚNICA fuente del
 * permiso de las hojas de navegación (`appRoutes`, EC-960): así el sidebar
 * nunca ofrece un enlace que el proxy rebote.
 */
export function getRouteRequirement(pathname: string): PermissionRequirement | undefined {
  return findRoutePermissionRule(pathname)?.permission;
}

/**
 * Página a la que el proxy manda a quien abre una ruta sin su permiso
 * (EC-895). No tiene regla en `routePermissions`, así que nunca se redirige a
 * sí misma; solo exige sesión y workspace, como cualquier ruta del matcher.
 */
export const ACCESS_DENIED_PATH = "/access-denied";

/**
 * Redirección del proxy por permisos para `pathname`: `ACCESS_DENIED_PATH` si
 * la ruta tiene regla y `user` no la cumple, o `null` si puede entrar. Misma
 * regla que `canAccessRoute`.
 */
export function getRouteAccessRedirect(
  pathname: string,
  user?: PermissionContext | null,
): string | null {
  return canAccessRoute(pathname, user) ? null : ACCESS_DENIED_PATH;
}

/**
 * ¿El proxy dejaría entrar a `user` en `pathname`? Para no ofrecer enlaces que
 * rebotan a "sin acceso": un enlace solo se pinta si su destino es abrible. Sin regla
 * se permite, igual que en el proxy (que además exige sesión y workspace, ya
 * garantizados dentro de la app). `pathname` va sin query.
 */
export function canAccessRoute(pathname: string, user?: PermissionContext | null): boolean {
  const rule = findRoutePermissionRule(pathname);
  if (!rule) return true;
  const required = Array.isArray(rule.permission) ? rule.permission : [rule.permission];
  return hasAnyPermission(required, user);
}
