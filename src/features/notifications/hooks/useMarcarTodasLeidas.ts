import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { marcarTodasLeidas } from "../services/actions";
import type { Notificacion } from "../interfaces/notification.interface";
import { NOTIFICACIONES_QUERY_KEY } from "./useNotificaciones";

/**
 * Marca como leídas TODAS las no leídas del usuario.
 *
 * El backend ignora cualquier filtro, así que el optimista también aplica a
 * toda la lista —incluidas las que el dropdown recortó y solo se ven en el
 * modal—. Al compartir llave con `useNotificaciones`, el dropdown y el modal
 * quedan en sincronía en el mismo commit, y la invalidación de `onSettled`
 * refresca la superficie que siga abierta.
 */
export const useMarcarTodasLeidas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: marcarTodasLeidas,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICACIONES_QUERY_KEY });

      const previous = queryClient.getQueryData<Notificacion[]>(
        NOTIFICACIONES_QUERY_KEY,
      );

      queryClient.setQueryData<Notificacion[]>(
        NOTIFICACIONES_QUERY_KEY,
        (current) =>
          current?.map((notificacion) =>
            notificacion.leido ? notificacion : { ...notificacion, leido: true },
          ),
      );

      return { previous };
    },
    onSuccess: ({ actualizadas }) => {
      toast.success(
        actualizadas === 1
          ? "1 notificación marcada como leída"
          : `${actualizadas} notificaciones marcadas como leídas`,
      );
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICACIONES_QUERY_KEY, context.previous);
      }
      // Solo un 400 trae un motivo que mostrar; un 5xx o un fallo de red cae
      // al texto en español (ver `useToggleCostCenterActivo`).
      const drfMessage =
        error instanceof AxiosError && error.response?.status === 400
          ? firstDrfFieldMessage(error)
          : undefined;
      toast.error(
        drfMessage ?? "No se pudieron marcar las notificaciones como leídas.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICACIONES_QUERY_KEY });
    },
  });
};
