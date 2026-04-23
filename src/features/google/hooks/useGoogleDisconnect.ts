import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleDisconnect } from "../services/actions";

/* Revoca los tokens de Google y limpia el estado de conexión en el backend */
export const useGoogleDisconnect = () => {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, unknown, void>({
    mutationKey: ["google", "oauth", "disconnect"],
    mutationFn: () => googleDisconnect(),
    retry: 0,
    onSuccess: () => {
      /* Invalida el status para que el componente refleje el nuevo estado */
      queryClient.invalidateQueries({ queryKey: ["google", "oauth", "status"] });
      toast.success("Cuenta de Google desconectada correctamente.");
    },
    onError: () => {
      toast.error("No se pudo desconectar la cuenta de Google.");
    },
  });
};
