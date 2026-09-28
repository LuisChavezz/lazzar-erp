import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { rejectVacation } from "../services/actions";
import { VacationRejectVariables } from "../interfaces/vacation.interface";
import { VACATIONS_KEY } from "./useVacations";
import { vacationActionErrorMessage } from "./vacationErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingVacationIds`). */
export const rejectVacationMutationKey = ["reject-vacation"] as const;

interface UseRejectVacationOptions {
  /**
   * Si se pasa, un error del backend sobre `motivo_rechazo` se entrega aquí EN
   * VEZ de notificarse con toast, para que el diálogo lo pinte bajo su campo.
   * Mismo patrón que `onReasonError` en `useCancelPurchaseOrder`.
   */
  onReasonError?: (message: string) => void;
}

/**
 * Rechaza una solicitud: `POST /hr/vacaciones/{id}/rechazar/` con
 * `{ motivo_rechazo }`. `motivo_rechazo` SOLO viaja por aquí, nunca en el alta
 * ni en el PATCH.
 *
 * Sin optimista, por el mismo motivo que `useApproveVacation`.
 */
export const useRejectVacation = ({ onReasonError }: UseRejectVacationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectVacationMutationKey,
    mutationFn: ({ id, motivo_rechazo }: VacationRejectVariables) =>
      rejectVacation(id, { motivo_rechazo }),
    onSuccess: () => {
      toast.success("Solicitud de vacaciones rechazada");
    },
    onError: (error) => {
      console.error(error);
      const reasonMessage = drfFieldMessage(error, "motivo_rechazo");
      if (reasonMessage && onReasonError) {
        onReasonError(reasonMessage);
        return;
      }
      toast.error(vacationActionErrorMessage(error, "No se pudo rechazar la solicitud. Intenta de nuevo."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: VACATIONS_KEY }),
  });
};
