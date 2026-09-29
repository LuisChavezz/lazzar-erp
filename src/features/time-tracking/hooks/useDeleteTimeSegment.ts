import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteTimeSegment } from "../services/actions";
import { TIME_TRACKING_KEY_ROOT } from "./useTimeSegments";
import {
  timeSegmentActionErrorMessage,
  toastTimeSegmentError,
} from "./timeTrackingErrorMessages";

export const deleteTimeSegmentMutationKey = ["time-tracking-delete"] as const;

export interface DeleteTimeSegmentVariables {
  id: number;
}

/**
 * Borrado físico. Sin optimista, igual que el borrado de asistencia: la
 * confirmación queda abierta y bloqueada hasta que el servidor responde y el
 * desglose se refresca.
 */
export const useDeleteTimeSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteTimeSegmentMutationKey,
    mutationFn: ({ id }: DeleteTimeSegmentVariables) => deleteTimeSegment(id),
    onSuccess: () => {
      toast.success("Tramo eliminado");
    },
    onError: (error) => {
      console.error(error);
      toastTimeSegmentError(timeSegmentActionErrorMessage(error, "No se pudo eliminar el tramo."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TIME_TRACKING_KEY_ROOT }),
  });
};
