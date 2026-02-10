
import { v1_api } from "@/src/api/v1.api";
import { User } from "../interfaces/user.interface";

export const getUsers = async (): Promise<User[]> => {
  const response = await v1_api.get("/usuarios/");

  return response.data;
};