import axios from "axios";
import { removeApiVersion } from "../utils/removeApiVersion";
import { DEFAULT_REQUEST_TIMEOUT_MS } from "@/src/constants/httpTimeouts";

/**
 * Cliente de autenticación (login, MFA, logout, refresh y el `authorize()` de
 * NextAuth). Lleva el mismo tope que `v1_api` (EC-939): la renovación de sesión
 * (`refreshToken`) corre aquí, y sin tope una renovación colgada dejaba en
 * espera, para siempre, a todas las peticiones encoladas por el interceptor de
 * 401. Al vencer, el refresh rechaza como cualquier refresh fallido: se rechaza
 * la cola y se cierra la sesión. `logout` pasa su propio tope, más corto.
 */
const api = axios.create({
  baseURL: removeApiVersion(process.env.NEXT_PUBLIC_API_URL || ""),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  proxy: false,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  transitional: { clarifyTimeoutError: true },
});

export { api };
