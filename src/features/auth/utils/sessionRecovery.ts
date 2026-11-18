import {
  clearLoopMark,
  isRecentLoopMark,
  LOOP_GUARD_WINDOW_MS,
  readLoopMark,
  writeLoopMark,
} from "./loopGuardStorage";

/**
 * Recuperación de la sesión de NextAuth en el cliente (EC-767).
 *
 * El layout de (Main) ya no entrega sesión inicial a `SessionProvider` (las
 * rutas son estáticas), así que en cada carga completa la sesión llega por
 * `GET /api/auth/session`. Si esa petición falla (timeout, 5xx, red), next-auth
 * 4.24 la trata como "sin sesión" (`fetchData` devuelve `null`), `useSession()`
 * queda en `unauthenticated` y NUNCA vuelve a pedirla: el refetch al volver a la
 * pestaña sale de inmediato cuando la sesión en caché es `null`.
 *
 * Dentro de (Main) ese estado casi nunca es real: `src/proxy.ts` solo sirve la
 * ruta si la cookie de NextAuth descifra y no ha expirado. Por eso, en vez de
 * creerle a `null`, se pregunta de nuevo con estas piezas puras.
 */

/**
 * Esperas antes de cada reintento automático (ms). Cuatro intentos en ~7.5 s;
 * agotados, el sidebar ofrece "Reintentar" en lugar de seguir insistiendo.
 */
export const SESSION_RECOVERY_DELAYS_MS: readonly number[] = [500, 1_000, 2_000, 4_000];

/**
 * Margen (ms) para que `SessionProvider` termine de releer la sesión cuando el
 * último intento sí la encontró, antes de dar la ronda por agotada.
 */
export const SESSION_REFETCH_GRACE_MS = 1_000;

/** Endpoint de sesión de NextAuth (basePath por defecto). */
export const SESSION_ENDPOINT = "/api/auth/session";

/**
 * Qué dijo una consulta directa al endpoint de sesión:
 *
 * - `session`: hay sesión; falta que `SessionProvider` la recoja.
 * - `none`: respuesta válida SIN sesión (`{}`): la cookie se borró o expiró, o se
 *   cerró sesión en otra pestaña. Es definitiva: no se reintenta, se recarga
 *   para que el proxy mande a login (`reloadThroughProxy`).
 * - `failed`: error de red, status no 2xx o cuerpo que no es JSON. Transitorio.
 */
export type SessionProbeResult = "session" | "none" | "failed";

/** Clasifica la respuesta del endpoint de sesión (`ok` = status 2xx). */
export const classifySessionResponse = (ok: boolean, body: unknown): SessionProbeResult => {
  if (!ok || body === null || typeof body !== "object" || Array.isArray(body)) {
    return "failed";
  }
  if ("user" in body && (body as { user?: unknown }).user) {
    return "session";
  }
  return Object.keys(body).length === 0 ? "none" : "failed";
};

/** Consulta el endpoint de sesión sin pasar por la caché de next-auth. */
export const probeSession = async (signal: AbortSignal): Promise<SessionProbeResult> => {
  try {
    const response = await fetch(SESSION_ENDPOINT, { cache: "no-store", signal });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      return "failed";
    }
    return classifySessionResponse(response.ok, body);
  } catch {
    return "failed";
  }
};

/** Clave del canal entre pestañas de next-auth (`BroadcastChannel` de `client/_utils.js`). */
export const NEXTAUTH_MESSAGE_KEY = "nextauth.message";

/**
 * Pide a `SessionProvider` que vuelva a leer la sesión y la reparta a todos los
 * `useSession()`.
 *
 * next-auth 4.24 no expone una API para esto cuando la sesión en caché es
 * `null`: `update()` sale si no hay sesión, `getSession()` solo avisa a las OTRAS
 * pestañas, y el refetch por `visibilitychange` sale con sesión `null`. El único
 * camino que sí relee es el de sincronización entre pestañas: `SessionProvider`
 * escucha el evento `storage` con clave `nextauth.message` y, con
 * `{ event: "session", data }`, llama a `_getSession({ event: "storage" })`, que
 * pide la sesión sin importar la caché y hace `setSession`. Se dispara ese mismo
 * evento en esta pestaña (ver `BroadcastChannel` en
 * `node_modules/next-auth/client/_utils.js` y el `useEffect` de `broadcast.receive`
 * en `next-auth/react/index.js`). Por eso `next-auth` va FIJADO a 4.24.15 en
 * `package.json` (sin `^`): antes de subirlo, `tests/unit/session-provider-refetch.spec.ts`
 * debe pasar con la versión nueva, porque monta el `SessionProvider` real.
 */
export const requestSessionRefetch = () => {
  // Autocontenida a propósito (literales, sin `NEXTAUTH_MESSAGE_KEY` ni
  // `nextAuthSessionMessage`): `session-provider-refetch.spec.ts` la serializa y
  // la ejecuta en Chromium, donde no existen los símbolos de este módulo.
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "nextauth.message",
      newValue: JSON.stringify({
        event: "session",
        data: { trigger: "getSession" },
        timestamp: Math.floor(Date.now() / 1000),
      }),
    })
  );
};

/**
 * Avisa a las OTRAS pestañas que se cerró la sesión, con el mismo mensaje que
 * `signOut` de next-auth 4.24 (`broadcast.post` en `next-auth/react/index.js`):
 * escribe `nextauth.message` en `localStorage`, el navegador dispara `storage`
 * en las demás pestañas y su `SessionProvider` relee la sesión. Dentro de
 * (Main) esa relectura vuelve vacía y `SessionRecoveryProvider` recarga por el
 * proxy, que las manda al login (EC-851).
 *
 * Solo tiene sentido con la cookie YA borrada: si otra pestaña relee la sesión
 * mientras la cookie sigue viva, la respuesta de `/api/auth/session` vuelve a
 * escribirla. Por eso no se llama antes de navegar a `/auth/logout`, sino al
 * montar el login con la sesión confirmada como vacía
 * (`settleSignedOutClientState`). Nunca lanza: sin `localStorage` no hay canal.
 */
export const broadcastSignOut = () => {
  try {
    window.localStorage.setItem(
      NEXTAUTH_MESSAGE_KEY,
      JSON.stringify({
        event: "session",
        data: { trigger: "signout" },
        timestamp: Math.floor(Date.now() / 1000),
      })
    );
  } catch {
    // Almacenamiento bloqueado: las otras pestañas se enteran en su siguiente 401.
  }
};

/**
 * Sin sesión definitiva (`200 {}`) dentro de (Main): la pestaña recarga la URL
 * actual y deja que `src/proxy.ts` la mande a `/auth/login` con su `callbackUrl`.
 * Esa respuesta solo llega cuando la cookie ya no sirve —se cerró sesión en otra
 * pestaña, se borró, o el endpoint la rechazó y la limpió (`JWT_SESSION_ERROR`)—,
 * y en todos esos casos el proxy, que la descifra con el mismo secreto, redirige.
 *
 * Guarda contra ciclos: si el proxy dejara pasar la recarga (p. ej. un desfase de
 * nombre de cookie entre `getToken` y la ruta de sesión), la página volvería a
 * recibir `{}` y recargaría sin fin. Se anota la recarga en `sessionStorage` y,
 * si se repite para la misma URL dentro de esta ventana, no se recarga: la ronda
 * acaba como agotada (aviso con "Reintentar").
 */
export const NO_SESSION_RELOAD_KEY = "erp:no-session-reload";
export const NO_SESSION_RELOAD_WINDOW_MS = LOOP_GUARD_WINDOW_MS;

/** ¿Hay que recargar? `false` si ya se recargó por lo mismo hace poco. */
export const shouldReloadForNoSession = (
  previousMark: string | null,
  url: string,
  now: number
): boolean => {
  if (!previousMark) return true;
  try {
    const mark = JSON.parse(previousMark) as { url?: unknown; at?: unknown };
    return !(isRecentLoopMark(mark.at, now) && mark.url === url);
  } catch {
    return true;
  }
};

/**
 * Recarga para que el proxy decida (ver arriba). Devuelve `false` sin recargar si
 * la guarda contra ciclos lo impide o si `sessionStorage` no está disponible
 * (sin poder anotar, recargar arriesga el ciclo).
 */
export const reloadThroughProxy = (): boolean => {
  const url = window.location.href;
  const now = Date.now();
  const previousMark = readLoopMark(NO_SESSION_RELOAD_KEY);
  if (previousMark === undefined || !shouldReloadForNoSession(previousMark, url, now)) {
    return false;
  }
  if (!writeLoopMark(NO_SESSION_RELOAD_KEY, JSON.stringify({ url, at: now }))) return false;
  window.location.reload();
  return true;
};

/** Olvida la marca de recarga (la sesión volvió a estar disponible). */
export const clearNoSessionReloadMark = () => clearLoopMark(NO_SESSION_RELOAD_KEY);

/** Espera `ms` o hasta que se aborte `signal` (lo que pase primero). */
export const waitFor = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
