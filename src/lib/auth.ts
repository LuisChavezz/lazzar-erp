import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { login } from "@/src/features/auth/services/actions";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Llamar al servicio de autenticación
        try {
          const data = await login(credentials.email, credentials.password);

          // Verificar si la autenticación fue exitosa
          if (data && data.token) {
            return {
              id: data.user_id.toString(),
              name: data.nombre_completo,
              email: data.email,
              role: data.is_admin_empresa ? "admin" : "user",
              token: data.token,
              permissions: data.permisos,
            };
          }

          return null;

        } catch (error) { // Manejar errores de autenticación
          console.error("Error en autenticación:", error);
          return null;
        }
      },
    }),
  ],
  pages: { // Personalizar páginas de autenticación
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.accessToken = (user as { token?: string }).token;
        token.permissions = (user as { permissions?: string[] }).permissions;
        token.sub = (user as { id?: string }).id || token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { accessToken?: string }).accessToken = token.accessToken as string;
        (session.user as { permissions?: string[] }).permissions = token.permissions as string[];
        (session.user as { id: string }).id = (token.sub as string);
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "secreto-super-seguro-para-desarrollo",
};
