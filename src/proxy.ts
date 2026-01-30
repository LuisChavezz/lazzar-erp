import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  // Matcher optimizado para excluir explícitamente API y estáticos,
  // pero proteger dashboard, select-branch, home y company-registration
  matcher: [
    "/",
    "/dashboard/:path*", 
    "/select-branch/:path*",
    "/company-registration/:path*"
  ],
};
