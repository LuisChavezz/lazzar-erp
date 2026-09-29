import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { setAttendanceJustification } from "../services/actions";
import {
  ESTADO_AL_QUITAR_JUSTIFICACION,
  ESTADO_JUSTIFICADA,
} from "../constants/attendanceChoices";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { ATTENDANCE_KEY_ROOT } from "./useAttendance";
import { handleAttendanceWriteError } from "./attendanceErrorMessages";

export const setJustificationMutationKey = ["attendance-justification"] as const;

export interface SetJustificationVariables {
  target: AttendanceRowTarget & { id: number };
  /** `true` justifica; `false` quita la justificación. */
  justify: boolean;
}

/**
 * Justificar (`estado: "justificada"`) o quitar la justificación
 * (`ESTADO_AL_QUITAR_JUSTIFICACION`, que el servidor reemplaza por el estado
 * derivado de las horas). Es la ÚNICA escritura del módulo que lleva `estado`,
 * y solo la ofrece quien tiene `D-RH`.
 */
export const useSetJustification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: setJustificationMutationKey,
    mutationFn: ({ target, justify }: SetJustificationVariables) =>
      setAttendanceJustification(target.id, {
        estado: justify ? ESTADO_JUSTIFICADA : ESTADO_AL_QUITAR_JUSTIFICACION,
      }),
    onSuccess: (_data, { justify }) => {
      toast.success(justify ? "Registro justificado" : "Justificación retirada");
    },
    onError: (error, { justify }) => {
      console.error(error);
      toast.error(
        handleAttendanceWriteError(
          error,
          justify ? "No se pudo justificar el registro." : "No se pudo quitar la justificación."
        )
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY_ROOT }),
  });
};
