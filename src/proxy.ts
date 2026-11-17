import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { getRouteAccessRedirect } from "./utils/routeAccess";
import { authSecret } from "./lib/authSecret";

/**
 * Proxy de autenticación y autorización (Next.js 16 — antes "middleware").
 *
 * Se pasa explícitamente el `secret` (tanto a `withAuth` como a `getToken`) para
 * garantizar que use la misma clave que `getServerSession(authOptions)` en los
 * Server Components. Sin esto, si `NEXTAUTH_SECRET` no está definido, se verifica
 * el JWT con `undefined` y se produce un ciclo infinito de redirecciones. La
 * resolución del secreto vive en `./lib/authSecret` para compartir exactamente
 * la misma lógica y valor.
 *
 * `/auth/login` se maneja en el wrapper de abajo, NO dentro de `withAuth`:
 * `withAuth` hace un bypass temprano de la página de signIn (ver
 * next-auth/next/middleware.js) y nunca ejecuta su función interna para esa
 * ruta, así que el redirect "ya autenticado → /" no puede vivir ahí.
 */
const authMiddleware = withAuth(
  function onAuthorized(req) {

    const pathname = req.nextUrl.pathname; // Obtener la ruta actual

    const hasWorkspace = req.cookies.has("erp_workspace_id"); // Verificar si hay workspace seleccionado
    const isSelectBranchPage = pathname.startsWith("/select-branch"); // Verificar si es la página de selección de sucursal

    // Redirigir a la página de selección de sucursal si no hay workspace y no es la página de selección
    if (!hasWorkspace && !isSelectBranchPage) {
      return NextResponse.redirect(new URL("/select-branch", req.url));
    }

    // Permiso de la ruta: la regla de `routePermissions` que coincide, con la
    // MISMA búsqueda que los enlaces de la app (`canAccessRoute`). Un código o
    // un arreglo (cualquiera de ellos), con el cortocircuito del rol "admin".
    // Sin permiso, a la página "sin acceso" (EC-895), que no tiene regla.
    const token = req.nextauth?.token;
    const redirectPath = getRouteAccessRedirect(pathname, {
      role: token?.role as string | undefined,
      permissions: token?.permissions as string[] | undefined,
    });
    if (redirectPath) {
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    return NextResponse.next();
  },
  {
    // Usar el mismo secret que authOptions para evitar discrepancias en la verificación del JWT
    secret: authSecret,
    pages: {
      signIn: "/auth/login",
    },
  }
);

/**
 * Wrapper del middleware.
 *
 * Para `/auth/login` resolvemos aquí el redirect "usuario ya autenticado → /"
 * porque `withAuth` hace bypass de la página de signIn. Se usa `getToken`, que
 * solo decodifica/verifica el JWT de la cookie de sesión en el edge (sin llamada
 * de red ni cold start de serverless) — es la misma comprobación que `withAuth`
 * hace internamente para el resto de rutas. Esto reemplaza el `getServerSession`
 * bloqueante que antes vivía en `login/page.tsx`, permitiendo que esa página sea
 * estática (prerenderizada/CDN). Los usuarios NO autenticados pasan y reciben el
 * HTML estático del login sin bucle.
 *
 * El resto de rutas se delega a `withAuth` sin cambios (workspace + permisos).
 */
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Comparación exacta (no `startsWith`): el matcher de abajo solo registra la
  // ruta exacta "/auth/login" (sin `/:path*`), así que el middleware nunca se
  // invoca para sub-rutas — un `startsWith` aquí sugeriría falsamente que sí.
  // Si se añade una sub-ruta bajo /auth/login que necesite este mismo redirect,
  // hay que actualizar AMBOS: esta condición y el matcher.
  if (pathname === "/auth/login") {
    return getToken({ req, secret: authSecret }).then((token) =>
      token
        ? NextResponse.redirect(new URL("/", req.url))
        : NextResponse.next()
    );
  }

  // `withAuth` adjunta `req.nextauth` en runtime; el cast solo satisface el tipo
  // `NextRequestWithAuth` que exige su firma.
  return authMiddleware(req as NextRequestWithAuth, event);
}

export const config = {
  matcher: [ // Rutas protegidas por autenticación
    "/",
    // /auth/login entra en el matcher para redirigir a usuarios YA autenticados
    // hacia "/" (ver wrapper). A los NO autenticados se les sirve el login.
    "/auth/login",
    "/select-branch/:path*",
    // Página "sin acceso" (EC-895): exige sesión y workspace como el resto,
    // pero no tiene regla de permiso, así que no puede redirigirse a sí misma.
    "/access-denied",
    "/config/:path*",
    "/system/:path*",
    "/sales/:path*",
    // Ruta neutra de detalle de pedido (accesible desde varios módulos). Exige
    // auth + workspace y, además, CUALQUIERA de los permisos de la regla
    // "/orders" en `routePermissions` (no un permiso de módulo concreto: se
    // llega desde Ventas, Mesa de Control, WMS, Compras y Producción). Ver
    // `app/(main)/orders/[id]`.
    "/orders/:path*",
    "/wms/:path*",
    "/procurement/:path*",
    "/manufacturing/:path*",
    "/finance/:path*",
    "/hr/:path*",
    "/operations/:path*",
  ],
};
