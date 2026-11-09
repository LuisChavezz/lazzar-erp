import type { AppRouteGroup } from "../constants/appRoutes";
import type { PermissionContext } from "../interfaces/permission-context.interface";
import { canAccessRoute } from "./routeAccess";

/**
 * Destino de los puntos de ENTRADA a un módulo (tarjeta de Home, item del
 * sidebar, cabecera del módulo en el sidebar, casita de `ModuleNav`) para
 * `user` (EC-813):
 *
 * 1. la portada (`modulePath`) si el proxy lo deja entrar (`canAccessRoute`);
 * 2. si no, la primera hoja navegable (`showInSidebar !== false`, en el orden
 *    de `items`) que sí puede abrir. Es el caso de quien solo tiene un código de
 *    sección (p. ej. `R-WMS-PICKING` sin `R-WMS`): la portada exige el de
 *    módulo y el proxy lo rebotaría al Home;
 * 3. `null` si no puede abrir ninguna. Cada consumidor decide qué hace con eso
 *    (ocultar la tarjeta, no pintar el enlace, volver al Home).
 *
 * Vive aparte de `routeAccess` a propósito: aquel lo importa el proxy y este
 * recibe grupos de `appRoutes`, que arrastran componentes de iconos.
 */
export function getModuleEntryHref(
  group: AppRouteGroup,
  user?: PermissionContext | null,
): string | null {
  if (canAccessRoute(group.modulePath, user)) return group.modulePath;
  return (
    group.items.find((item) => item.showInSidebar !== false && canAccessRoute(item.path, user))?.path ??
    null
  );
}
