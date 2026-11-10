import { signOut } from "next-auth/react";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { clearWorkspaceCookie } from "@/src/features/workspace/utils/workspaceCookie";

/**
 * Borra el estado del cliente que pertenece al USUARIO de la sesión (EC-848):
 * el workspace persistido (sucursal elegida y nombre de la empresa) y la cookie
 * `erp_workspace_id`. Corre en los dos cierres de sesión (`useLogout` y el 401
 * forzado de `v1_api`), al montar el login (`LoginStepManager`, donde ya no
 * queda nada de la sesión anterior montado que lo reescriba) y al entrar con
 * una sesión nueva (`enterNewSession`).
 *
 * No toca la caché de TanStack Query: vive solo en memoria, y todos esos
 * caminos terminan en una carga completa de la página que la descarta.
 *
 * A propósito NO borra:
 * - `theme-storage` y `sidebar-storage`: preferencias del navegador, no datos.
 * - `nextauth.message` (localStorage): el canal entre pestañas de next-auth.
 * - La marca anti-ciclo de `sessionRecovery` (sessionStorage).
 * - `sat-storage`: la Dirección fiscal capturada a mano, que hoy solo existe ahí
 *   (no llega al backend); borrarla la perdería sin respaldo.
 *
 * Un cambio de empresa del mismo usuario (EC-847) tendrá su propio alcance,
 * junto a este; no se resuelve aquí.
 */
export const clearUserScopedClientState = () => {
  useWorkspaceStore.getState().clearWorkspace();
  clearWorkspaceCookie();
};

const LOGIN_PATH = "/auth/login";

/**
 * Cierra la sesión de NextAuth y lleva a `/auth/login` con una carga completa.
 *
 * `signOut` hace fetch a /api/auth/* (csrf + signout) y solo DESPUÉS asigna
 * `window.location`. Si ese fetch falla, la promesa se rechaza sin navegar y la
 * pestaña quedaría en estado zombi (sesión aparentemente viva, todas las
 * llamadas en 401, sin salida): por eso la redirección a mano como respaldo.
 */
export const signOutToLogin = async (): Promise<void> => {
  try {
    await signOut({ callbackUrl: LOGIN_PATH });
  } catch {
    window.location.href = LOGIN_PATH;
  }
};

const POST_LOGIN_PATH = "/select-branch";

/**
 * Entra a la app con la sesión recién creada: limpia el estado del usuario
 * anterior y navega con una carga COMPLETA, no con `router.push`. Si la sesión
 * anterior caducó sin cerrarla, la pestaña conserva en memoria la caché de
 * TanStack Query de ese usuario; la carga completa la descarta.
 *
 * Sin el workspace anterior, el proxy deja pasar solo a `/select-branch`, que
 * no lo necesita: lee la empresa de la sesión y escribe sucursal y cookie al
 * elegir.
 */
export const enterNewSession = () => {
  clearUserScopedClientState();
  window.location.assign(POST_LOGIN_PATH);
};
