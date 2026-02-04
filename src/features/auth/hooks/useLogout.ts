import { signOut } from "next-auth/react";

export const useLogout = () => {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  return {
    handleLogout,
  };
};
