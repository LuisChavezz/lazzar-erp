import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { hasAnyPermission } from "./utils/permissions";
import { routePermissions } from "./constants/routePermissions";
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
    const rule = routePermissions.find( // Encontrar la regla de permisos que coincida con la ruta actual
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    // Redirigir a la página de selección de sucursal si no hay workspace y no es la página de selección
    if (!hasWorkspace && !isSelectBranchPage) {
      return NextResponse.redirect(new URL("/select-branch", req.url));
    }

    // Verificar si hay una regla de permisos para la ruta actual
    if (rule) { // Si hay una regla de permisos para la ruta actual permite el acceso
      const token = req.nextauth?.token;
      // `permission` puede ser un código o un arreglo (regla que se cumple con
      // CUALQUIERA de ellos). Se normaliza a arreglo: para un código suelto,
      // `hasAnyPermission([code])` es idéntico a `hasPermission(code)` — mismo
      // cortocircuito de rol "admin" incluido.
      const required = Array.isArray(rule.permission)
        ? rule.permission
        : [rule.permission];
      const canAccess = hasAnyPermission(required, {
        role: token?.role as string | undefined,
        permissions: token?.permissions as string[] | undefined,
      });
      if (!canAccess) { // Si el usuario no tiene permisos para acceder a la ruta actual redirigir al home
        return NextResponse.redirect(new URL("/", req.url));
      }
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
