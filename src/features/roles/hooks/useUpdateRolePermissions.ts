import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Role, RolePermissions } from "../interfaces/role.interface";
import { updateRolePermissions } from "../services/actions";

export const useUpdateRolePermissions = (roleId: Role["id"]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-role-permissions", roleId],
    mutationFn: (rolePermissions: RolePermissions) =>
      updateRolePermissions(roleId, rolePermissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", roleId, "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Permisos actualizados correctamente");
    },
    onError: () => {
      toast.error("No se pudieron actualizar los permisos");
    },
  });
};
