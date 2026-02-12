
import { v1_api } from "@/src/api/v1.api";
import { RegisterUser, RegisterUserResponseErrors, User } from "../interfaces/user.interface";

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