import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { MfaLoginUser } from "@/src/features/auth/interfaces/auth.interface";

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
      },
      async authorize(credentials) {
        if (!credentials?.userData) return null;

        try {
          const user = JSON.parse(credentials.userData) as MfaLoginUser;
          const fullName =
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.username;

          return {
            id: String(user.id),
            name: fullName,
            email: user.email,
            /* Los permisos se implementarán en una iteración futura */
            role: "admin",
            permissions: [] as string[],
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "secreto-super-seguro-para-desarrollo",
};
