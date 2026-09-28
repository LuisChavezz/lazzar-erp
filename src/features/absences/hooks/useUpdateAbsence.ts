import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateAbsence } from "../services/actions";
import { AbsenceUpdateVariables } from "../interfaces/absence.interface";
import { ABSENCES_KEY } from "./useAbsences";
import { handleAbsenceWriteError, SetAbsenceFieldError } from "./absenceErrorMessages";

/**
 * No optimista, a propósito (como `useUpdateVacation`): la escritura depende de
 * la guarda previa contra el servidor (`preflightAbsenceWrite`).
 */
export const useUpdateAbsence = (setFieldError?: SetAbsenceFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: AbsenceUpdateVariables) => updateAbsence(id, values),
    onSuccess: () => {
      toast.success("Registro de ausencia actualizado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(handleAbsenceWriteError(error, "Error al actualizar la ausencia", setFieldError));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY }),
  });
};
