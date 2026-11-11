
import { v1_api } from "@/src/api/v1.api";
import {
  RegisterUser,
  RegisterUserResponseErrors,
  User,
  UserCatalogItem,
} from "../interfaces/user.interface";

export const getUsers = async (): Promise<User[]> => {
  const response = await v1_api.get("/usuarios/");

  return response.data;
};

export const registerUser = async (values: RegisterUser): Promise<User | RegisterUserResponseErrors> => {
  const response = await v1_api.post("/usuarios/", values);

  return response.data;
};

export const updateUser = async (id: number, values: RegisterUser): Promise<User | RegisterUserResponseErrors> => {
  const response = await v1_api.put(`/usuarios/${id}/`, values);

  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await v1_api.delete(`/usuarios/${id}/`);
};
/**
 * Catálogo reducido de usuarios para selectores (`GET /usuarios/catalogo/`,
 * nucleo-erp #1040): solo `id` y `nombre_completo` de los usuarios ACTIVOS de
 * la empresa activa, sin paginar. A diferencia de `/usuarios/`, lo puede leer
 * cualquier usuario autenticado (no exige permisos de gestión de usuarios).
 */
export const getUserCatalog = async (signal?: AbortSignal): Promise<UserCatalogItem[]> => {
  const { data } = await v1_api.get<UserCatalogItem[]>("/usuarios/catalogo/", { signal });
  return data;
};
