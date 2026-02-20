import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    token?: string;
    permissions?: string[];
  }

  interface Session {
    user: {
      id: string;
      role?: string;
      accessToken?: string;
      permissions?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    accessToken?: string;
    permissions?: string[];
    sub?: string;
  }
}
