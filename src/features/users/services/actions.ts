
import { v1_api } from "@/src/api/v1.api";
import { RegisterUserResponseErrors, User } from "../interfaces/user.interface";

export const getUsers = async (): Promise<User[]> => {
  const response = await v1_api.get("/usuarios/");

  return response.data;
};

export const registerUser = async (values: any): Promise<User | RegisterUserResponseErrors> => {
  const response = await v1_api.post("/usuarios/", values);

  return response.data;
};