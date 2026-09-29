import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createTimeSegment } from "../services/actions";
import type { TimeSegmentCreateBody } from "../interfaces/time-tracking.interface";
import { TIME_TRACKING_KEY_ROOT } from "./useTimeSegments";
import {
  handleTimeSegmentWriteError,
  toastTimeSegmentError,
  type SetTimeSegmentFieldError,
} from "./timeTrackingErrorMessages";

export const createTimeSegmentMutationKey = ["time-tracking-create"] as const;

/**
 * Alta de un tramo. No optimista: el servidor calcula `horas_trabajadas`.
 * `onSettled` devuelve la invalidación para que `mutateAsync` espere el
 * listado nuevo (el formulario siguiente parte de él).
 */
export const useCreateTimeSegment = (setFieldError?: SetTimeSegmentFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: createTimeSegmentMutationKey,
    mutationFn: (body: TimeSegmentCreateBody) => createTimeSegment(body),
    onSuccess: () => {
      toast.success("Tramo registrado");
    },
    onError: (error) => {
      console.error(error);
      toastTimeSegmentError(
        handleTimeSegmentWriteError(error, "No se pudo registrar el tramo.", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TIME_TRACKING_KEY_ROOT }),
  });
};
