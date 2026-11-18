import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { clearWorkspaceCookie } from "@/src/features/workspace/utils/workspaceCookie";
import { broadcastSignOut, probeSession } from "./sessionRecovery";
import { clearSignOutAttempts, registerSignOutAttempt } from "./signOutLoopGuard";
import { showSignOutFailureScreen } from "./signOutFailureScreen";

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
 * (`settleSignedOutClientState`, donde ya no queda nada de la sesión
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
 * - La cuenta de la guarda del cierre de sesión (sessionStorage, EC-851):
 *   tiene que sobrevivir al cierre que la anota; la borra `enterNewSession`.
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

/** Cierre de sesión del servidor por navegación (`src/app/auth/logout/route.ts`). */
export const SERVER_LOGOUT_PATH = "/auth/logout";

/**
 * ¿Ya empezó un cierre de sesión en ESTA carga de página? Un booleano del
 * módulo basta: cada carga completa vuelve a evaluar el módulo. La guarda
 * cuenta CICLOS, no llamadas: varios 401 en vuelo llaman a `signOutToLogin`
 * antes de que la navegación termine, y solo el primero anota un intento.
 */
let signOutStarted = false;

/** ¿La guarda ya cortó y la pantalla de error está a la vista? */
let signOutBlocked = false;

/**
 * ¿Ya hay un cierre de sesión en marcha (navegando o detenido en la pantalla
 * de error) en esta carga? `v1_api` lo consulta para no intentar otro refresh
 * con cada 401 que siga llegando: el siguiente paso ya está decidido.
 */
export const isSignOutUnderway = () => signOutStarted || signOutBlocked;

/** Solo para pruebas: devuelve el estado de la carga de página al inicial. */
export const resetSignOutPageState = () => {
  signOutStarted = false;
  signOutBlocked = false;
};

/**
 * "Reintentar" de la pantalla de error: empieza la cuenta de nuevo y navega
 * siempre, aunque `sessionStorage` no esté disponible para anotar el intento
 * (es un clic del usuario, no un ciclo).
 */
const retryServerLogout = () => {
  clearSignOutAttempts();
  registerSignOutAttempt();
  signOutStarted = true;
  window.location.href = SERVER_LOGOUT_PATH;
};

/**
 * Cierra la sesión: limpia el estado del usuario en el cliente y navega (carga
 * completa) a `/auth/logout`, que expira la cookie de sesión de NextAuth en el
 * servidor y manda al login (EC-851). Lo usan los dos cierres de sesión
 * (`useLogout` y el 401 forzado de `v1_api`).
 *
 * No usa `signOut` de next-auth. Ese camino (CSRF + POST a
 * `/api/auth/signout` por `fetch`) fallaba con la red caída, una respuesta que
 * no es JSON o un CSRF que no llegaba, y su respaldo navegaba a `/auth/login`
 * con la cookie viva: el proxy lo rebotaba a `/` → `/select-branch`, esa
 * página recibía 401 y se volvía a cerrar sesión, en ciclo. Una navegación de
 * documento no depende de nada de eso, y `src/lib/auth.ts` no tiene
 * `events.signOut` ni nada que solo corra en ese POST (con sesión JWT, el POST
 * solo borra la cookie, lo mismo que `/auth/logout`). El aviso a las otras
 * pestañas que mandaba `signOut` lo manda ahora el login, cuando la cookie ya
 * no existe (`settleSignedOutClientState`).
 *
 * La guarda de `signOutLoopGuard` es solo un respaldo: si la pestaña vuelve a
 * caer aquí en ciclo, corta tras `SIGN_OUT_MAX_ATTEMPTS` cargas y deja una
 * pantalla de error estable con "Reintentar". Sin `sessionStorage` no puede
 * contar y navega siempre. Llamadas repetidas en la misma
 * carga no hacen ninguna petición: vuelven a navegar, o no hacen nada si la
 * pantalla ya está a la vista.
 */
export const signOutToLogin = (): void => {
  clearUserScopedClientState();
  if (signOutBlocked) return;
  if (!signOutStarted) {
    if (registerSignOutAttempt() === "exhausted") {
      signOutBlocked = true;
      showSignOutFailureScreen(retryServerLogout);
      return;
    }
    signOutStarted = true;
  }
  window.location.href = SERVER_LOGOUT_PATH;
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
 *
 * También reinicia la cuenta de la guarda del cierre de sesión (EC-851): los
 * intentos de la sesión anterior no deben bloquear el próximo cierre de esta.
 */
export const enterNewSession = () => {
  clearUserScopedClientState();
  clearSignOutAttempts();
  window.location.replace(POST_LOGIN_PATH);
};

/**
 * Al montar el login, solo si el endpoint de sesión confirma que NO hay
 * sesión: limpia el estado del usuario en el cliente y avisa a las otras
 * pestañas (`broadcastSignOut`, el mismo mensaje que mandaba `signOut` de
 * next-auth). El proxy manda a "/" a quien tiene sesión, pero una página
 * servida desde la caché del navegador no pasa por él, y limpiar ahí borraría
 * el workspace de una sesión viva. Un fallo de la consulta (`failed`) tampoco
 * hace nada: `getSession()` lo devolvería como `null`, por eso se usa
 * `probeSession`, que distingue "sin sesión" de "no se pudo saber".
 *
 * El aviso sale aquí y no al navegar a `/auth/logout`: solo con la cookie ya
 * borrada es seguro que otra pestaña relea la sesión (ver `broadcastSignOut`).
 * La cookie es la misma para todas las pestañas, así que "sin sesión" aquí lo
 * es en todas: avisar también al abrir el login sin venir de un cierre solo
 * hace que las demás relean una sesión que ya no tienen.
 */
export const settleSignedOutClientState = async (signal: AbortSignal) => {
  if ((await probeSession(signal)) === "none" && !signal.aborted) {
    clearUserScopedClientState();
    broadcastSignOut();
  }
};
