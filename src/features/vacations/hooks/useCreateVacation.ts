import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createVacation } from "../services/actions";
import { VACATIONS_KEY } from "./useVacations";
import { handleVacationWriteError, SetVacationFieldError } from "./vacationErrorMessages";

/**
 * No inyecta `empresa` desde el workspace porque el backend resuelve el tenant
 * a partir de `empleado`. `solicitado_por` lo fija el servidor con el usuario
 * de la sesión. Mismo caso que `useCreateEvaluation`.
 */
export const useCreateVacation = (setFieldError?: SetVacationFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVacation,
    onSuccess: () => {
      toast.success("Solicitud de vacaciones registrada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleVacationWriteError(error, "Error al registrar la solicitud de vacaciones", setFieldError)
      );
    },
    // Se devuelve la promesa para que `mutateAsync` no resuelva hasta que el
    // refetch termine: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: VACATIONS_KEY }),
  });
};
