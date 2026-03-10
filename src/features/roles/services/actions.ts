
import { v1_api } from "@/src/api/v1.api";
import { Role, RolePermissions } from "../interfaces/role.interface";



export const getRoles = async (): Promise<Role[]> => {
  const response = await v1_api.get<Role[]>("/seguridad/roles/");
  return response.data;
};

export const getRolePermissions = async (roleId: Role["id"]): Promise<RolePermissions> => {
  const response = await v1_api.get<RolePermissions>(`/seguridad/roles/${roleId}/permisos/`);
  return response.data;
};

export const updateRolePermissions = async (roleId: Role["id"], rolePermissions: RolePermissions): Promise<RolePermissions & { status: string }> => {
  const response = await v1_api.put<RolePermissions & { status: string }>(`/seguridad/roles/${roleId}/permisos/`, rolePermissions);
  return response.data;
};