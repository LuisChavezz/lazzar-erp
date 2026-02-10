import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    token?: string;
    isSuperUser?: boolean;
  }

  interface Session {
    user: {
      role?: string;
      accessToken?: string;
      isSuperUser?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    accessToken?: string;
    isSuperUser?: boolean;
  }
}
