import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { approveVacation } from "../services/actions";
import { VACATIONS_KEY } from "./useVacations";
import { vacationActionErrorMessage } from "./vacationErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingVacationIds`). */
export const approveVacationMutationKey = ["approve-vacation"] as const;

/**
 * Aprueba una solicitud: `POST /hr/vacaciones/{id}/aprobar/`.
 *
 * SIN actualización optimista, mismo criterio que `useCerrarConciliacion`: el
 * servidor es quien fija `autorizado_por` y `fecha_aprobacion`, y puede
 * rechazar la transición (400 si la solicitud ya no está pendiente). Se espera
 * la respuesta y se invalida el listado, también tras un error: un 400 dice
 * que la fila en caché está vieja.
 */
export const useApproveVacation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: approveVacationMutationKey,
    mutationFn: (id: number) => approveVacation(id),
    onSuccess: () => {
      toast.success("Solicitud de vacaciones aprobada");
    },
    onError: (error) => {
      console.error(error);
      toast.error(vacationActionErrorMessage(error, "No se pudo aprobar la solicitud. Intenta de nuevo."));
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: VACATIONS_KEY }),
  });
};
