import axios from "axios";
import { api } from "@/src/api/api";
import {
  LoginErrorResponse,
  LoginResponse,
  LoginSuccessResponse,
  MfaConfirmResponse,
  MfaCreateResponse,
  MfaLoginPayload,
  MfaLoginSuccessResponse,
  RefreshTokenResponse,
} from "../interfaces/auth.interface";


export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginSuccessResponse>(
      "/auth/login/",
      {
        email,
        password,
      },
    );

    return response.data;
  } catch (error) {
    if (
      axios.isAxiosError<LoginErrorResponse>(error) &&
      error.response?.status === 400 &&
      error.response.data
    ) {
      return error.response.data;
    }

    throw error;
  }
};

export const createMfa = async (): Promise<MfaCreateResponse> => {
  const response = await api.post<MfaCreateResponse>("/auth/mfa/", {
    method: "app",
  });
  return response.data;
}

export const confirmMfa = async (otp: string): Promise<MfaConfirmResponse> => {
  const response = await api.post<MfaConfirmResponse>("/auth/mfa/confirm/", {
    method: "app",
    code: otp,
  });
  return response.data;
}

export const mfaLogin = async (mfaPayload: MfaLoginPayload): Promise<MfaLoginSuccessResponse> => {
  const response = await api.post<MfaLoginSuccessResponse>("/auth/login/verify/", mfaPayload);
  return response.data;
}

/**
 * Invalida la sesión del backend. `timeoutMs` la acota (axios `timeout`): el
 * cliente `api` no tiene ninguno y una petición colgada dejaba el botón de
 * "Cerrar sesión" en `isPending` sin llegar nunca al cierre local (EC-851).
 */
export const logout = async (timeoutMs?: number): Promise<void> => {
  await api.post("/auth/logout/", undefined, { timeout: timeoutMs });
};

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const response = await api.post<RefreshTokenResponse>("/auth/token/refresh/");
  return response.data;
}