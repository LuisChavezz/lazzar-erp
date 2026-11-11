import { signOut } from "next-auth/react";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { clearWorkspaceCookie } from "@/src/features/workspace/utils/workspaceCookie";
import { probeSession } from "./sessionRecovery";

/**
 * Borra el estado del cliente que pertenece al USUARIO de la sesión (EC-848):
 * el workspace persistido (sucursal elegida y nombre de la empresa) y la cookie
 * `erp_workspace_id`. Corre en los dos cierres de sesión (`useLogout` y el 401
 * forzado de `v1_api`), al montar el login si no hay sesión
 * (`clearUserScopedClientStateIfSignedOut`, donde ya no queda nada de la sesión
 * anterior montado que lo reescriba) y al entrar con una sesión nueva
 * (`enterNewSession`).
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
 * Un cambio de empresa del mismo usuario (EC-847) reusa esta misma limpieza
 * (`completeCompanySwitch`): la sucursal elegida es de la empresa anterior.
 * Lo demás de ese cambio (marcar la empresa nueva como confirmada, escribirla
 * en la sesión y la carga completa que descarta la caché) vive allí.
 *
 * Nunca lanza: corre justo antes de navegar (cierres de sesión, login) y un
 * fallo de almacenamiento no debe impedirlo. `persist` de zustand no atrapa
 * los errores de `localStorage.setItem` (cuota llena, almacenamiento
 * bloqueado), así que cada paso se intenta por separado y se ignora su fallo:
 * lo que no se pudo borrar lo vuelve a intentar el siguiente límite de sesión.
 */
export const clearUserScopedClientState = () => {
  try {
    useWorkspaceStore.getState().clearWorkspace();
  } catch {
    // Sin poder escribir el store persistido, al menos la cookie.
  }
  try {
    clearWorkspaceCookie();
  } catch {
    // `document.cookie` no disponible: nada más que hacer.
  }
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

/**
 * Destino tras iniciar sesión. Los `signIn("credentials", …)` lo pasan como
 * `callbackUrl` explícito: sin él, next-auth usa `window.location.href` y lo
 * guarda en la cookie `next-auth.callback-url`, que conservaría un query con
 * credenciales si el login se cargó con uno (EC-863). Con `redirect: false`
 * next-auth no navega; la navegación sigue siendo `enterNewSession`.
 */
export const POST_LOGIN_PATH = "/select-branch";

/**
 * Entra a la app con la sesión recién creada: limpia el estado del usuario
 * anterior y navega con una carga COMPLETA, no con `router.push`. Si la sesión
 * anterior caducó sin cerrarla, la pestaña conserva en memoria la caché de
 * TanStack Query de ese usuario; la carga completa la descarta.
 *
 * `replace`, no `assign`: el login sale del historial, así que "Atrás" no
 * vuelve a mostrarlo (desde la caché del navegador, sin pasar por el proxy) a
 * un usuario que ya tiene sesión.
 *
 * Sin el workspace anterior, el proxy deja pasar solo a `/select-branch`, que
 * no lo necesita: lee la empresa de la sesión y escribe sucursal y cookie al
 * elegir.
 */
export const enterNewSession = () => {
  clearUserScopedClientState();
  window.location.replace(POST_LOGIN_PATH);
};

/**
 * Limpieza al montar el login: solo si el endpoint de sesión confirma que NO
 * hay sesión. El proxy manda a "/" a quien la tiene, pero una página servida
 * desde la caché del navegador no pasa por él, y limpiar ahí borraría el
 * workspace de una sesión viva. Un fallo de la consulta (`failed`) tampoco
 * limpia: `getSession()` lo devolvería como `null`, por eso se usa
 * `probeSession`, que distingue "sin sesión" de "no se pudo saber".
 */
export const clearUserScopedClientStateIfSignedOut = async (signal: AbortSignal) => {
  if ((await probeSession(signal)) === "none" && !signal.aborted) {
    clearUserScopedClientState();
  }
};
