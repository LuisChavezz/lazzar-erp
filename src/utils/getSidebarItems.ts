import { getSidebarSectionsByPath } from "../constants/sidebarItems";
import { PermissionContext } from "../interfaces/permission-context.interface";
import { hasPermission } from "./permissions";


export const getSidebarItems = (
  context?: PermissionContext | null,
  pathname: string = "/"
) =>
  getSidebarSectionsByPath(pathname)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.permission ? hasPermission(item.permission, context) : true
      ),
    }))
    .filter((section) => section.items.length > 0);
