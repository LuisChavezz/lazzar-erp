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

