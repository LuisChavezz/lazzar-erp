import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        // Simulación de validación directa (sin fetch a API interna)
        try {
          const { email, password } = credentials;

          // Simular delay de base de datos
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Validación hardcodeada
          if (email === "demo@example.com" && password === "123456") {
            return {
              id: "1",
              name: "Usuario Demo",
              email: "demo@example.com",
              role: "admin",
              token: "mock_jwt_token_123456",
            };
          }

          return null;
        } catch (error) {
          console.error("Error en autenticación:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    // error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.accessToken = (user as { token?: string }).token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "secreto-super-seguro-para-desarrollo",
};
