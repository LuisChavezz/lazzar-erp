import "next-auth";
import "next-auth/jwt";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    permissions?: string[];
    is_admin_empresa?: boolean;
    is_superuser?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
      permissions?: string[];
      /**
       * Tal como los manda el backend al iniciar sesión. `undefined` en una
       * sesión creada antes de que se guardaran: "no se sabe", nunca `false`.
       */
      is_admin_empresa?: boolean;
      is_superuser?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: string[];
    is_admin_empresa?: boolean;
    is_superuser?: boolean;
  }
}
