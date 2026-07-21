import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { MfaLoginUser } from "@/src/features/auth/interfaces/auth.interface";

// Extender tipos de NextAuth para incluir tokens
declare module "next-auth" {
  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    role?: string;
    permissions?: string[];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        /* Recibe el objeto usuario serializado como JSON desde el cliente
         * tras un login exitoso (con o sin MFA). No se realiza ninguna
         * llamada adicional al backend ya que la autenticación fue completada
         * y las cookies de sesión ya quedaron establecidas. */
        userData: { label: "User Data", type: "text" },
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userData) return null;

        try {
          const user = JSON.parse(credentials.userData) as MfaLoginUser;
          const isAdminUser = user.is_admin_empresa || user.es_admin || user.is_superuser;
          const fullName =
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.username;

          return {
            id: String(user.id),
            name: fullName,
            email: user.email,
            role: isAdminUser ? "admin" : "user",
            permissions: user.permisos,
            accessToken: credentials.accessToken || "",
            refreshToken: credentials.refreshToken || "",
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.permissions = user.permissions;
        token.sub = user.id || token.sub;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "secreto-super-seguro-para-desarrollo",
};
