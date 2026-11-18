/**
 * Nombres de la cookie de sesión de NextAuth (EC-851).
 *
 * `src/lib/auth.ts` no configura `cookies`, así que aplican los nombres por
 * defecto de next-auth 4.24 (`core/lib/cookie.js`): `next-auth.session-token`,
 * con el prefijo `__Secure-` cuando `NEXTAUTH_URL` es https. Si el JWT pasa de
 * ~4 KB, next-auth lo parte en trozos `<nombre>.0`, `<nombre>.1`, …
 * (`SessionStore`). Todas viven en `path=/`, sin `Domain`.
 */
export const SESSION_COOKIE_BASE_NAME = "next-auth.session-token";

/** Prefijo que next-auth antepone cuando usa cookies seguras. */
export const SECURE_COOKIE_PREFIX = "__Secure-";

const SESSION_COOKIE_PATTERN = /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/;

/** ¿Es `name` la cookie de sesión de NextAuth, con o sin prefijo, o uno de sus trozos? */
export const isSessionCookieName = (name: string): boolean => SESSION_COOKIE_PATTERN.test(name);

/**
 * Nombres que hay que expirar para cerrar la sesión: las dos formas sin trozos
 * siempre (aunque la petición no las traiga) y cualquier otra forma que sí
 * traiga, como los trozos. Sin repetidos.
 */
export const sessionCookieNamesToExpire = (requestCookieNames: readonly string[]): string[] => [
  ...new Set([
    SESSION_COOKIE_BASE_NAME,
    `${SECURE_COOKIE_PREFIX}${SESSION_COOKIE_BASE_NAME}`,
    ...requestCookieNames.filter(isSessionCookieName),
  ]),
];
