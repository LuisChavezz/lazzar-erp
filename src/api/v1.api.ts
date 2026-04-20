import axios, { InternalAxiosRequestConfig } from "axios";
import { signOut } from "next-auth/react";
import { refreshToken } from "@/src/features/auth/services/actions";

// Extiende la config de axios para soportar el flag de reintento y evitar bucles
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const v1_api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  proxy: false,
});

// Estado del mutex de refresco — módulo-nivel para ser compartido entre llamadas concurrentes
let isRefreshing = false;
let refreshQueue: Array<(error?: Error) => void> = [];

// Notifica a todas las solicitudes encoladas el resultado del refresh
const notifyQueue = (error?: Error): void => {
  refreshQueue.forEach((cb) => cb(error));
  refreshQueue = [];
};

/**
 * Interceptor de respuesta con lógica de refresh token.
 *
 * Flujo ante un 401:
 *   1. Si no se ha reintentado (_retry = false): intenta refrescar vía POST /auth/token/refresh/
 *   2. Las solicitudes concurrentes que también reciban 401 se encolan y se reintentan
 *      automáticamente cuando el refresh termine con éxito.
 *   3. Si el refresh falla (refresh token expirado), cierra la sesión con signOut.
 *   4. Si el retry también falla con 401 (_retry = true), cierra la sesión directamente.
 *
 * Al ser cookie-based (withCredentials: true), el backend gestiona los Set-Cookie:
 * el browser envía auth-refresh-jwt en la llamada refresh y recibe el nuevo auth-jwt.
 */
v1_api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const is401 = error.response?.status === 401;

    // Sin 401 o sin config de solicitud → propagar el error directamente
    if (!is401 || !originalRequest) {
      return Promise.reject(error);
    }

    // El retry también falló con 401 → sesión inválida, cerrar sesión
    if (originalRequest._retry) {
      if (typeof window !== "undefined") {
        await signOut({ callbackUrl: "/auth/login" });
      }
      return Promise.reject(error);
    }

    // Refresh en progreso → encolar esta solicitud para reintentarla después
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((err) => {
          if (err) {
            reject(error);
          } else {
            originalRequest._retry = true;
            resolve(v1_api(originalRequest));
          }
        });
      });
    }

    // Primer 401: iniciar el refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try { // Intentar refrescar el token
      await refreshToken();
      notifyQueue();
      return v1_api(originalRequest);

    } catch { // El refresh falló → cerrar sesión
      notifyQueue(new Error("Refresh fallido"));
      if (typeof window !== "undefined") {
        await signOut({ callbackUrl: "/auth/login" });
      }
      return Promise.reject(error);

    } finally { // Reset del estado de refresco
      isRefreshing = false;
    }
  }
);

export { v1_api };
