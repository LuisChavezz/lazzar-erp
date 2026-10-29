import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { deleteCalendar } from "../services/actions";
import { Calendar } from "../interfaces/calendar.interface";

/**
 * Clave de la mutación: el menú de cada fila lee de la `MutationCache` qué ids
 * tienen un borrado en vuelo (ver `usePendingCalendarIds`).
 */
export const deleteCalendarMutationKey = ["delete-calendar"] as const;

export const useDeleteCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteCalendarMutationKey,
    mutationFn: deleteCalendar,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["calendars"] });
      const previousCalendars = queryClient.getQueryData<Calendar[]>(["calendars"]);

      // Borrado REAL: la fila desaparece de la base, así que el optimista la
      // filtra. Es lo contrario de los catálogos de RH con baja lógica, donde
      // filtrar la hacía desaparecer para reaparecer con el refetch.
      if (previousCalendars) {
        queryClient.setQueryData<Calendar[]>(["calendars"], (old) =>
          old ? old.filter((calendar) => calendar.id !== id) : []
        );
      }

      return { previousCalendars };
    },
    onError: (err, id, context) => {
      if (context?.previousCalendars) {
        queryClient.setQueryData(["calendars"], context.previousCalendars);
      }
      console.error(err);
      toast.error(extractErrorMessage(err, "Error al eliminar el día de calendario"));
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["calendars"] }),
    onSuccess: () => {
      toast.success("Día de calendario eliminado correctamente");
    },
  });
};
