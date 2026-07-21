import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { api } from "@/src/api/api";
import type { MfaLoginUser } from "@/src/features/auth/interfaces/auth.interface";
import { authSecret } from "./authSecret";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        /* Token `access` emitido por el backend en la respuesta de login
         * (presente tanto en el flujo sin MFA como tras verificar el OTP).
         * No se confía en su contenido: sirve únicamente como credencial para
         * volver a preguntarle al backend quién es el usuario. */
        accessToken: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = credentials?.accessToken;

        if (!accessToken) return null;

        /* La identidad y los permisos se obtienen SIEMPRE del backend, nunca de
         * datos enviados por el cliente: `authorize` se expone públicamente en
         * /api/auth/callback/credentials y cualquiera puede invocarlo con un
         * payload arbitrario. Confiar en un objeto de usuario serializado por
         * el cliente permitiría acuñar una sesión con role "admin" sin haberse
         * autenticado nunca contra Django.
         *
         * `/auth/user/` exige un token válido (IsAuthenticated +
         * JWTCookieAuthentication, que prioriza el header Authorization sobre
         * la cookie), así que un token falsificado o caducado devuelve 401 y
         * no se crea sesión. Se usa el header y no la cookie HttpOnly porque
         * `auth-jwt` está acotada al origen del backend y nunca llega hasta
         * aquí, que es código de servidor del propio Next.js.
         *
         * Esta llamada ocurre solo durante el sign-in: con `strategy: "jwt"`,
         * las comprobaciones de sesión posteriores únicamente ejecutan los
         * callbacks `jwt`/`session`, no `authorize`. */
        try {
          const { data: user } = await api.get<MfaLoginUser>("/auth/user/", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!user || user.id === undefined || user.id === null) {
            return null;
          }

          const isAdminUser = user.is_admin_empresa || user.es_admin || user.is_superuser;
          const fullName =
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.username;

          return {
            id: String(user.id),
            name: fullName,
            email: user.email,
            role: isAdminUser ? "admin" : "user",
            permissions: user.permisos
          };
        } catch {
          /* Token inválido/caducado, backend caído o respuesta inesperada:
           * sin verificación no hay sesión. Nunca se degrada a los datos
           * enviados por el cliente. */
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
  secret: authSecret,
};
