import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const hasWorkspace = req.cookies.has("erp_workspace_id");
    const isSelectBranchPage = req.nextUrl.pathname.startsWith("/select-branch");
    
    // Redirigir a la página de selección de sucursal si no hay workspace y no es la página de selección
    if (!hasWorkspace && !isSelectBranchPage) {
      return NextResponse.redirect(new URL("/select-branch", req.url));
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
  matcher: [
    "/",
    "/dashboard/:path*", 
    "/select-branch/:path*",
    "/config/:path*",
    "/orders/:path*",
    "/production/:path*",
    "/inventories/:path*",
    "/purchase-orders/:path*",
    "/receipts/:path*",
    "/invoicing/:path*",
    "/accounts-payable/:path*",
    "/accounts-receivable/:path*",
    "/bank-accounts/:path*",
    "/accounting/:path*",
  ],
};
