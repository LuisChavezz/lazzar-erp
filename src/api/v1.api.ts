import axios, { InternalAxiosRequestConfig } from "axios";
import { refreshToken } from "@/src/features/auth/services/actions";
import {
  isSignOutUnderway,
  signOutToLogin,
} from "@/src/features/auth/utils/clientSessionState";

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
 * Cierra la sesión de forma garantizada: `signOutToLogin` limpia el estado del
 * usuario (EC-842, EC-848) y navega a `/auth/logout`, que borra la cookie de
 * sesión en el servidor (EC-851). Es síncrono y no hace peticiones, y repetirlo
 * en la misma carga no anota otro intento en la guarda contra ciclos, así que
 * no necesita latch propio.
 */
const forceSignOut = (): void => {
  if (typeof window === "undefined") return;
  signOutToLogin();
};

/**
 * Interceptor de respuesta con lógica de refresh token.
 *
 * Flujo ante un 401:
 *   1. Si no se ha reintentado (_retry = false): intenta refrescar vía POST /auth/token/refresh/
 *   2. Las solicitudes concurrentes que también reciban 401 se encolan y se reintentan
 *      automáticamente cuando el refresh termine con éxito.
 *   3. Si el refresh falla (refresh token expirado), cierra la sesión (`forceSignOut`).
 *   4. Si el retry también falla con 401 (_retry = true), cierra la sesión directamente.
 *   5. Si ya hay un cierre de sesión en marcha en esta carga (navegando, o detenido en
 *      la pantalla de error de la guarda), no intenta otro refresh: rechaza sin red.
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

    // Ya se está cerrando la sesión (EC-851): otro refresh solo sumaría
    // peticiones contra una sesión que ya se dio por perdida.
    if (isSignOutUnderway()) {
      forceSignOut();
      return Promise.reject(error);
    }

    // El retry también falló con 401 → sesión inválida, cerrar sesión
    if (originalRequest._retry) {
      forceSignOut();
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
      forceSignOut();
      return Promise.reject(error);

    } finally { // Reset del estado de refresco
      isRefreshing = false;
    }
  }
);

export { v1_api };
