import { v1_api } from "@/src/api/v1.api";
import { LoginResponse } from "../interfaces/auth.interface";


export const login = async (email: string, password: string): Promise<LoginResponse> => {
  
  const  response = await v1_api.post("/login/", {
    email,
    password,
  });
  return response.data;
};
