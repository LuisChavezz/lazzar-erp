import { useMutation } from "@tanstack/react-query";
import { LoginResponse } from "../interfaces/auth.interface";
import { login } from "../services/actions";
import { clearSignOutAttempts } from "../utils/signOutLoopGuard";

export interface LoginCredentials {
  email: string;
  password: string;
}

export const useLogin = () => {
  return useMutation<LoginResponse, unknown, LoginCredentials>({
    mutationKey: ["auth", "login"],
    mutationFn: ({ email, password }) => {
      /* Empieza un inicio de sesión: la marca de "acabo de cerrar sesión" ya no
       * aplica. Sin borrarla aquí, la consulta de sesión que lanza el login al
       * montarse podría responder ya con la sesión NUEVA mientras la marca sigue
       * puesta, y `settleSignedOutClientState` la cerraría (EC-851).
       * `enterNewSession` la vuelve a borrar al terminar. */
      clearSignOutAttempts();
      return login(email, password);
    },
    retry: 0,
  });
};
