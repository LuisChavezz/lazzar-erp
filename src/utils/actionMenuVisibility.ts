import type { ActionMenuItem } from "@/src/components/ActionMenu";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "./permissions";

/**
 * Items de un `ActionMenu` que el usuario ve: los que no se ocultaron con
 * `visible: false` y cuyo `permission`, si lo traen, tiene. Es la ÚNICA regla
 * de visibilidad del menú: `ActionMenu` la usa para decidir si se pinta o cae
 * a su `renderWhenEmpty`.
 */
export const getVisibleActionItems = (
  items: readonly ActionMenuItem[],
  user?: PermissionContext | null,
): ActionMenuItem[] =>
  items.filter(
    (item) => (item.visible ?? true) && (!item.permission || hasPermission(item.permission, user)),
  );
