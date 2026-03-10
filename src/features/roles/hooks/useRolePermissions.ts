import { useQuery } from "@tanstack/react-query";
import { Role, RolePermissions } from "../interfaces/role.interface";
import { getRolePermissions } from "../services/actions";

export const useRolePermissions = (roleId?: Role["id"]) => {
  return useQuery<RolePermissions>({
    queryKey: ["roles", roleId, "permissions"],
    queryFn: () => getRolePermissions(roleId!),
    enabled: Boolean(roleId),
  });
};
