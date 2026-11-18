import { NextResponse, type NextRequest } from "next/server";
import {
  SECURE_COOKIE_PREFIX,
  sessionCookieNamesToExpire,
} from "@/src/features/auth/utils/sessionCookieNames";

/**
 * Cierre de sesión del lado del servidor, por navegación (EC-851).
 *
 * Es el único cierre de sesión de la app: `signOutToLogin` (logout manual y
 * 401 forzado) navega aquí con una carga completa, sin `signOut` de next-auth.
 * Expira la cookie de sesión de NextAuth en todas sus formas y manda a
 * `/auth/login`, donde el login avisa a las otras pestañas. Antes, si el
 * `signOut` de next-auth fallaba, la cookie seguía viva, el proxy rebotaba el
 * login a `/` → `/select-branch`, esa página recibía 401 y la pestaña recargaba
 * en ciclo.
 *
 * Fuera del `matcher` de `src/proxy.ts` a propósito: el proxy mandaría a `/` a
 * quien todavía tiene la cookie, que es justo quien necesita llegar aquí.
 *
 * Es un GET sin CSRF, así que un enlace de otro sitio puede cerrar la sesión
 * (logout CSRF). Se acepta: solo borra la sesión de este navegador, no expone
 * datos ni ejecuta nada más.
 *
 * No toca las cookies del backend (`auth-jwt`, `auth-refresh-jwt`): viven en
 * el dominio del backend, que este servidor no puede escribir.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url), 303);
  const isHttps = request.nextUrl.protocol === "https:";
  const requestCookieNames = request.cookies.getAll().map((cookie) => cookie.name);

  for (const name of sessionCookieNamesToExpire(requestCookieNames)) {
    // Mismo `path` y atributos que la escritura de next-auth: un borrado sin
    // `path=/` tomaría el de esta ruta (`/auth`) y no alcanzaría la cookie. El
    // navegador rechaza un `__Secure-` sin `Secure`.
    response.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps || name.startsWith(SECURE_COOKIE_PREFIX),
      maxAge: 0,
      expires: new Date(0),
    });
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
