import { v1_api } from "@/src/api/v1.api";


export const login = async (email: string, password: string) => {
  
  const  response = await v1_api.post("usuarios/api/v1/login/", {
    email,
    password,
  });
  return response.data;
};