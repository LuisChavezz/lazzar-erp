import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteAbsence } from "../services/actions";
import { Absence } from "../interfaces/absence.interface";
import { ABSENCES_KEY } from "./useAbsences";
import { absenceActionErrorMessage } from "./absenceErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingAbsenceIds`). */
export const deleteAbsenceMutationKey = ["delete-absence"] as const;

export const useDeleteAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteAbsenceMutationKey,
    mutationFn: deleteAbsence,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ABSENCES_KEY });
      const previousAbsences = queryClient.getQueryData<Absence[]>(ABSENCES_KEY);

      // Borrado FÍSICO: la fila no vuelve con el refetch, así que el optimista
      // la saca del listado. Mismo patrón que `useDeleteVacation`.
      if (previousAbsences) {
        queryClient.setQueryData<Absence[]>(ABSENCES_KEY, (old) =>
          old ? old.filter((absence) => absence.id !== id) : []
        );
      }

      return { previousAbsences };
    },
    onError: (err, _id, context) => {
      if (context?.previousAbsences) {
        queryClient.setQueryData(ABSENCES_KEY, context.previousAbsences);
      }
      console.error(err);
      toast.error(absenceActionErrorMessage(err, "No se pudo eliminar el registro. Intenta de nuevo."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY }),
    onSuccess: () => {
      toast.success("Registro de ausencia eliminado correctamente");
    },
  });
};
