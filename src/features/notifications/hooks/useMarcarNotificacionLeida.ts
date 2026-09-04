import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { marcarNotificacionLeida } from "../services/actions";
import type { Notificacion } from "../interfaces/notification.interface";
import { NOTIFICACIONES_QUERY_KEY } from "./useNotificaciones";

/**
 * Marca una notificación como leída.
 *
 * Actualización optimista porque al hacer clic el usuario navega EN EL ACTO: el
 * atenuado de la fila no puede esperar a que responda el servidor o se vería
 * el estado viejo durante el cierre del dropdown. `onError` revierte desde el
 * snapshot y avisa; `onSettled` invalida para reconciliar con `leido_at` real.
 *
 * Sin `toast.success`: el clic ya produce una navegación visible, y un toast
 * por cada notificación abierta sería ruido.
 */
export const useMarcarNotificacionLeida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: marcarNotificacionLeida,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICACIONES_QUERY_KEY });

      const previous = queryClient.getQueryData<Notificacion[]>(
        NOTIFICACIONES_QUERY_KEY,
      );

      queryClient.setQueryData<Notificacion[]>(
        NOTIFICACIONES_QUERY_KEY,
        (current) =>
          current?.map((notificacion) =>
            notificacion.id === id
              ? { ...notificacion, leido: true }
              : notificacion,
          ),
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICACIONES_QUERY_KEY, context.previous);
      }
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "No se pudo marcar la notificación como leída"),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICACIONES_QUERY_KEY });
    },
  });
};
