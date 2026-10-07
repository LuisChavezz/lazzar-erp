import { routePermissions } from "../constants/routePermissions";
import type { PermissionContext } from "../interfaces/permission-context.interface";
import { hasAnyPermission } from "./permissions";

/**
 * Regla de `routePermissions` que gobierna `pathname`, con la MISMA búsqueda
 * que el proxy: la primera cuyo `prefix` coincide exacto o como segmento
 * (`prefix/`). `undefined` si la ruta no tiene regla.
 */
export function findRoutePermissionRule(pathname: string) {
  return routePermissions.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * ¿El proxy dejaría entrar a `user` en `pathname`? Para no ofrecer enlaces que
 * rebotan al Home: un enlace solo se pinta si su destino es abrible. Sin regla
 * se permite, igual que en el proxy (que además exige sesión y workspace, ya
 * garantizados dentro de la app). `pathname` va sin query.
 */
export function canAccessRoute(pathname: string, user?: PermissionContext | null): boolean {
  const rule = findRoutePermissionRule(pathname);
  if (!rule) return true;
  const required = Array.isArray(rule.permission) ? rule.permission : [rule.permission];
  return hasAnyPermission(required, user);
}
