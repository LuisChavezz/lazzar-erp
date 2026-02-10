import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const hasWorkspace = req.cookies.has("erp_workspace_id");
    const isSelectBranchPage = req.nextUrl.pathname.startsWith("/select-branch");
    
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
    "/config/:path*"
  ],
};
