export interface PermissionContext {
  role?: string;
  permissions?: string[];
}

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

