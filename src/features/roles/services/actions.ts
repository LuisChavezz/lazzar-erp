
import { v1_api } from "@/src/api/v1.api";
import { Role } from "../interfaces/role.interface";



export const getRoles = async (): Promise<Role[]> => {
  const response = await v1_api.get("/seguridad/roles/");

  return response.data;
};