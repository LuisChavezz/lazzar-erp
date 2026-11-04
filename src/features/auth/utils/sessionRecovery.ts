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
 *   cerró sesión en otra pestaña. Es una respuesta definitiva: no se reintenta.
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
 * en `next-auth/react/index.js`). Si se actualiza next-auth, revisar que siga así.
 */
export const requestSessionRefetch = () => {
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
