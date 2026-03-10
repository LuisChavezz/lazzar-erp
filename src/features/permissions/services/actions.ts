
import { v1_api } from "@/src/api/v1.api";
import { Permission } from "../interfaces/permission.interface";



export const getPermissions = async (): Promise<Permission[]> => {
  const response = await v1_api.get("/seguridad/permisos/");
  return response.data;
};
