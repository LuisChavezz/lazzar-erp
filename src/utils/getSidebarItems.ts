import { getSidebarSectionsByPath, type SidebarItem } from "../constants/sidebarItems";
import { PermissionContext } from "../interfaces/permission-context.interface";
import { hasAnyPermission, hasPermission } from "./permissions";

/**
 * ¿Se le muestra este acceso al usuario?
 *
 * `permissionAnyOf` (items de MÓDULO) se satisface con CUALQUIERA de sus
 * códigos; `permission` (sub-rutas) exige ese código exacto. Sin código, visible.
 */
const canSeeItem = (item: SidebarItem, context?: PermissionContext | null) => {
  if (item.permissionAnyOf?.length) {
    return hasAnyPermission(item.permissionAnyOf, context);
  }
  return item.permission ? hasPermission(item.permission, context) : true;
};

export const getSidebarItems = (
  context?: PermissionContext | null,
  pathname: string = "/"
) =>
  getSidebarSectionsByPath(pathname)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeItem(item, context)),
    }))
    .filter((section) => section.items.length > 0);
