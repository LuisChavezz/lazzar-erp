import { v1_api } from "@/src/api/v1.api";
import { removeApiVersion } from "@/src/utils/removeApiVersion";
import type { MfaLoginUser } from "../interfaces/auth.interface";

/**
 * `GET /api/auth/user/` desde el NAVEGADOR, con la cookie `auth-jwt` del
 * backend (EC-842). La ruta vive fuera de `/api/v1` (auth_kit), por eso se
 * cambia `baseURL`; se usa `v1_api` y no `api` para heredar el refresh ante un
 * 401 (el access token dura 15 min y esta es la primera llamada de la app).
 *
 * Archivo aparte de `actions.ts` porque `v1.api.ts` importa `refreshToken` de
 * ahí: meter esta llamada en el mismo módulo crearía un ciclo de imports.
 */
export const getCurrentUser = async (): Promise<MfaLoginUser> => {
  const response = await v1_api.get<MfaLoginUser>("/auth/user/", {
    baseURL: removeApiVersion(process.env.NEXT_PUBLIC_API_URL || ""),
  });
  return response.data;
};
