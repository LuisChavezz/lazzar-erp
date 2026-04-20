import { useMutation } from "@tanstack/react-query";
import { LoginResponse } from "../interfaces/auth.interface";
import { login } from "../services/actions";

export interface LoginCredentials {
  email: string;
  password: string;
}

export const useLogin = () => {
  return useMutation<LoginResponse, unknown, LoginCredentials>({
    mutationKey: ["auth", "login"],
    mutationFn: ({ email, password }) => login(email, password),
    retry: 0,
  });
};
