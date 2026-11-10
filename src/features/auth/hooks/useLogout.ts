import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
// import toast from "react-hot-toast";
import { logout } from "../services/actions";
import { clearUserScopedClientState } from "../utils/clientSessionState";

export const useLogout = () => {
  const mutation = useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: async () => {
      /* Limpia el estado local antes de invalidar la sesión en el servidor */
      clearUserScopedClientState();
      await logout();
    },
    retry: 0,
    onSuccess: async () => {
      await signOut({ callbackUrl: "/auth/login" });
    },
    onError: async () => {
      /* Si la petición al servidor falla, cerramos la sesión local de todos modos
       * para evitar dejar al usuario en un estado inconsistente */
      // toast.error("Hubo un problema al cerrar sesión en el servidor. Cerrando sesión localmente.");
      await signOut({ callbackUrl: "/auth/login" });
    },
  });

  return {
    handleLogout: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
};
