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

/**
 * Almacena los tokens en sessionStorage para que estén disponibles
 * cuando se llame a signIn() en el cliente
 */
const storeTokens = (access?: string, refresh?: string) => {
  if (typeof window !== "undefined") {
    if (access) sessionStorage.setItem("access_token", access);
    if (refresh) sessionStorage.setItem("refresh_token", refresh);
  }
};

/**
 * Limpia los tokens de sessionStorage
 */
const clearTokens = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
  }
};

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginSuccessResponse>(
      "/auth/login/",
      {
        email,
        password,
      },
    );

    // Almacenar tokens si están disponibles
    if (response.data.access) {
      storeTokens(response.data.access, response.data.refresh);
    }

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
};

export const confirmMfa = async (otp: string): Promise<MfaConfirmResponse> => {
  const response = await api.post<MfaConfirmResponse>("/auth/mfa/confirm/", {
    method: "app",
    code: otp,
  });
  return response.data;
};

export const mfaLogin = async (mfaPayload: MfaLoginPayload): Promise<MfaLoginSuccessResponse> => {
  const response = await api.post<MfaLoginSuccessResponse>("/auth/login/verify/", mfaPayload);
  
  // Almacenar tokens recibidos del login con MFA
  if (response.data.access) {
    storeTokens(response.data.access, response.data.refresh);
  }
  
  return response.data;
};

export const logout = async (): Promise<void> => {
  clearTokens();
  await api.post("/auth/logout/");
};

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const response = await api.post<RefreshTokenResponse>("/auth/token/refresh/");
  
  // Actualizar el access token con el nuevo valor
  if (response.data.access) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("access_token", response.data.access);
    }
  }
  
  return response.data;
};
