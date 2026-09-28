import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateVacation } from "../services/actions";
import { VacationUpdateVariables } from "../interfaces/vacation.interface";
import { VACATIONS_KEY } from "./useVacations";
import { handleVacationWriteError, SetVacationFieldError } from "./vacationErrorMessages";

export const useUpdateVacation = (setFieldError?: SetVacationFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: VacationUpdateVariables) => updateVacation(id, values),
    onSuccess: () => {
      toast.success("Solicitud de vacaciones actualizada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleVacationWriteError(error, "Error al actualizar la solicitud de vacaciones", setFieldError)
      );
    },
    // Se devuelve la promesa para que `mutateAsync` no resuelva hasta que el
    // refetch termine: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: VACATIONS_KEY }),
  });
};
