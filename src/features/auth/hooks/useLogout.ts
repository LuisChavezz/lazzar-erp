import { useMutation } from "@tanstack/react-query";
import { logout } from "../services/actions";
import { clearUserScopedClientState, signOutToLogin } from "../utils/clientSessionState";

export const useLogout = () => {
  const mutation = useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: async () => {
      /* Limpia el estado local antes de invalidar la sesión en el servidor */
      clearUserScopedClientState();
      await logout();
    },
    retry: 0,
    /* Con o sin éxito del backend se cierra la sesión local y se navega a login:
     * si la petición falla, el usuario no debe quedar en un estado inconsistente.
     * `signOutToLogin` navega aunque el propio `signOut` falle. */
    onSettled: () => signOutToLogin(),
  });

  return {
    handleLogout: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
};
