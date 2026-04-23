import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { GoogleConnectResponse } from "../interfaces/google.interface";
import { googleConnect } from "../services/actions";

/**
 * Hook para iniciar el flujo OAuth de Google.
 *
 * Flujo:
 * 1. Llama al backend para obtener la `auth_url` firmada.
 * 2. Redirige al navegador a dicha URL (Google Accounts consent screen).
 * 3. Google redirige al `redirect_uri` del backend, que gestiona
 *    el intercambio de tokens y los almacena en la base de datos.
 */
export const useGoogleConnect = () =>
  useMutation<GoogleConnectResponse, unknown, string>({
    mutationKey: ["google", "oauth", "connect"],
    mutationFn: (redirectUrl: string) => googleConnect(redirectUrl),
    retry: 0,
    onSuccess: (data) => {
      /* Redirigir al usuario a la pantalla de consentimiento de Google */
      window.location.href = data.auth_url;
    },
    onError: () => {
      toast.error("No se pudo iniciar la conexión con Google. Inténtalo de nuevo.");
    },
  });
