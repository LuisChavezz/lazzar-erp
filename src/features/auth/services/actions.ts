import { v1_api } from "@/src/api/v1.api";
import { OnSuccessRegisterResponse, RegisterFormValues } from "../interfaces/register.interface";


export const login = async (email: string, password: string) => {
  
  const  response = await v1_api.post("/login/", {
    email,
    password,
  });
  return response.data;
};

export const register = async (data: RegisterFormValues): Promise<OnSuccessRegisterResponse | { message: string }> => {
  const response = await v1_api.post("/onboarding/register/", data);
  return response.data;
};