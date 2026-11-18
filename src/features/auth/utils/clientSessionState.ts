import { getCsrfToken, signOut } from "next-auth/react";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { clearWorkspaceCookie } from "@/src/features/workspace/utils/workspaceCookie";
import { probeSession } from "./sessionRecovery";

/** Clave del antiguo store de la Dirección fiscal en `localStorage` (EC-860). */
export const LEGACY_SAT_STORAGE_KEY = "sat-storage";

/**
 * Borra el estado del cliente que pertenece al USUARIO de la sesión (EC-848):
 * el workspace persistido (sucursal elegida y nombre de la empresa), la cookie
 * `erp_workspace_id` y la clave `sat-storage` que dejó la Dirección fiscal
 * cuando solo vivía en el navegador (ahora vive en el backend, EC-860; ningún
 * código la lee ni la escribe, así que solo queda borrar la que ya existe).
 * Corre en los dos cierres de sesión (`useLogout` y el 401
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
  try {
    window.localStorage.removeItem(LEGACY_SAT_STORAGE_KEY);
  } catch {
    // Almacenamiento bloqueado: lo reintenta el siguiente límite de sesión.
  }
};

const LOGIN_PATH = "/auth/login";

/** Cierre de sesión del servidor por navegación (`src/app/auth/logout/route.ts`). */
export const SERVER_LOGOUT_PATH = "/auth/logout";

/**
 * Tiempo máximo (ms) para que `signOut` de next-auth termine (CSRF + POST)
 * antes de darlo por fallido. next-auth no pone timeout a sus `fetch`: sin
 * este límite una petición colgada dejaba la pestaña sin salida y el botón de
 * "Cerrar sesión" en `isPending` para siempre.
 */
export const SIGN_OUT_TIMEOUT_MS = 8_000;

/**
 * Respaldo cuando `signOut` no sirvió: navega (carga completa) a
 * `/auth/logout`, que expira la cookie de sesión de NextAuth en el servidor y
 * manda al login.
 */
const navigateToServerLogout = () => {
  window.location.href = SERVER_LOGOUT_PATH;
};

/**
 * Cierra la sesión de NextAuth y lleva a `/auth/login` con una carga completa.
 *
 * El camino normal es `signOut` de next-auth: pide el token CSRF, hace POST a
 * `/api/auth/signout` (que borra la cookie de sesión y avisa a las otras
 * pestañas) y solo DESPUÉS asigna `window.location`. Todo lo que impide que
 * ese camino termine cae al respaldo `/auth/logout` (EC-851):
 *
 * - `signOut` lanza: error de red, o una respuesta que no es JSON (un 5xx con
 *   HTML) hace que `res.json()` lance.
 * - Pasan `timeoutMs` sin terminar (petición colgada).
 * - No hay token CSRF: next-auth devuelve `null` sin lanzar si `/api/auth/csrf`
 *   falla, manda el POST con ese CSRF vacío y el servidor responde con su
 *   página genérica de confirmación (`/api/auth/signout?csrf=true`), con la
 *   sesión viva. Por eso el token se pide antes y, sin él, no se llama a
 *   `signOut`. `signOut` vuelve a pedirlo por su cuenta (no acepta uno dado):
 *   si esa segunda petición falla y la primera no, todavía se llega a esa
 *   página.
 *
 * El respaldo NO puede ser navegar a `/auth/login`: con la cookie viva el
 * proxy lo rebota a `/` → `/select-branch`, esa página recibe 401, el refresh
 * falla y se vuelve a cerrar sesión, en ciclo. `/auth/logout` borra la cookie
 * del lado del servidor, que es el único que puede (es HttpOnly).
 *
 * `timeoutMs` existe para las pruebas; el código de la app usa el default.
 */
export const signOutToLogin = async (timeoutMs = SIGN_OUT_TIMEOUT_MS): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("signOut excedió el tiempo")), timeoutMs);
  });

  try {
    const csrfToken = await Promise.race([getCsrfToken(), deadline]);
    if (!csrfToken) {
      navigateToServerLogout();
      return;
    }
    await Promise.race([signOut({ callbackUrl: LOGIN_PATH }), deadline]);
  } catch {
    navigateToServerLogout();
  } finally {
    clearTimeout(timer);
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
