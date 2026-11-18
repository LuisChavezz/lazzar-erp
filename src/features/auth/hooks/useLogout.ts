import { useMutation } from "@tanstack/react-query";
import { logout } from "../services/actions";
import { clearUserScopedClientState, signOutToLogin } from "../utils/clientSessionState";

/**
 * Tiempo máximo (ms) para el `POST /auth/logout/` del backend. Pasado, la
 * petición se da por fallida y el cierre sigue igual que con un error
 * (`onSettled`): el botón no puede quedarse en `isPending` (EC-851).
 */
export const BACKEND_LOGOUT_TIMEOUT_MS = 5_000;

export const useLogout = () => {
  const mutation = useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: async () => {
      /* Limpia el estado local antes de invalidar la sesión en el servidor */
      clearUserScopedClientState();
      await logout(BACKEND_LOGOUT_TIMEOUT_MS);
    },
    retry: 0,
    /* Con o sin éxito del backend se cierra la sesión local y se navega a login:
     * si la petición falla, el usuario no debe quedar en un estado inconsistente.
     * `signOutToLogin` navega a `/auth/logout`, que borra la sesión en el servidor. */
    onSettled: () => signOutToLogin(),
  });

  return {
    handleLogout: () => mutation.mutate(),
    isPending: mutation.isPending,
  };
};
