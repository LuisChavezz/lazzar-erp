import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteVacation } from "../services/actions";
import { Vacation } from "../interfaces/vacation.interface";
import { VACATIONS_KEY } from "./useVacations";
import { vacationActionErrorMessage } from "./vacationErrorMessages";

/**
 * Clave de la mutación: el menú de cada fila lee de la `MutationCache` qué ids
 * tienen una acción en vuelo (ver `usePendingVacationIds`).
 */
export const deleteVacationMutationKey = ["delete-vacation"] as const;

export const useDeleteVacation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteVacationMutationKey,
    mutationFn: deleteVacation,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: VACATIONS_KEY });
      const previousVacations = queryClient.getQueryData<Vacation[]>(VACATIONS_KEY);

      // Borrado FÍSICO: la fila no vuelve con el refetch, así que el optimista
      // la saca del listado. Mismo patrón que `useDeleteEvaluation`.
      if (previousVacations) {
        queryClient.setQueryData<Vacation[]>(VACATIONS_KEY, (old) =>
          old ? old.filter((vacation) => vacation.id !== id) : []
        );
      }

      return { previousVacations };
    },
    onError: (err, _id, context) => {
      if (context?.previousVacations) {
        queryClient.setQueryData(VACATIONS_KEY, context.previousVacations);
      }
      console.error(err);
      toast.error(
        vacationActionErrorMessage(err, "No se pudo eliminar la solicitud. Intenta de nuevo.")
      );
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: VACATIONS_KEY }),
    onSuccess: () => {
      toast.success("Solicitud de vacaciones eliminada correctamente");
    },
  });
};
