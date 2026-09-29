import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateTimeSegment } from "../services/actions";
import type { TimeSegmentUpdateBody } from "../interfaces/time-tracking.interface";
import { TIME_TRACKING_KEY_ROOT } from "./useTimeSegments";
import {
  handleTimeSegmentWriteError,
  toastTimeSegmentError,
  type SetTimeSegmentFieldError,
} from "./timeTrackingErrorMessages";

export const updateTimeSegmentMutationKey = ["time-tracking-update"] as const;

export interface UpdateTimeSegmentVariables {
  id: number;
  body: TimeSegmentUpdateBody;
}

/** Edición de un tramo (PATCH con las dos horas siempre). No optimista. */
export const useUpdateTimeSegment = (setFieldError?: SetTimeSegmentFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: updateTimeSegmentMutationKey,
    mutationFn: ({ id, body }: UpdateTimeSegmentVariables) => updateTimeSegment(id, body),
    onSuccess: () => {
      toast.success("Tramo actualizado");
    },
    onError: (error) => {
      console.error(error);
      toastTimeSegmentError(
        handleTimeSegmentWriteError(error, "No se pudo actualizar el tramo.", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TIME_TRACKING_KEY_ROOT }),
  });
};
