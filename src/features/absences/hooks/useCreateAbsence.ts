import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createAbsence } from "../services/actions";
import { ABSENCES_KEY } from "./useAbsences";
import { handleAbsenceWriteError, SetAbsenceFieldError } from "./absenceErrorMessages";

/**
 * Sin `empresa`: el backend resuelve el tenant a partir de `empleado`.
 * `solicitado_por` lo fija el servidor. Mismo caso que `useCreateVacation`.
 */
export const useCreateAbsence = (setFieldError?: SetAbsenceFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAbsence,
    onSuccess: () => {
      toast.success("Registro de ausencia creado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(handleAbsenceWriteError(error, "Error al registrar la ausencia", setFieldError));
    },
    // Se devuelve la promesa: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY }),
  });
};
