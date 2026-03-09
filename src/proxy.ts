import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasPermission } from "./utils/permissions";
import { routePermissions } from "./constants/routePermissions";



export default withAuth(
  function middleware(req) {

    const hasWorkspace = req.cookies.has("erp_workspace_id"); // Verificar si hay workspace seleccionado
    const isSelectBranchPage = req.nextUrl.pathname.startsWith("/select-branch"); // Verificar si es la página de selección de sucursal

    const pathname = req.nextUrl.pathname; // Obtener la ruta actual
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
      const canAccess = hasPermission(rule.permission, {
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
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [ // Rutas protegidas por autenticación
    "/",
    "/select-branch/:path*",
    "/config/:path*",
    "/system/:path*",
    "/sales/:path*",
    "/wms/:path*",
    "/procurement/:path*",
    "/manufacturing/:path*",
    "/finance/:path*",
    "/hr/:path*",
    "/other/:path*",
  ],
};
