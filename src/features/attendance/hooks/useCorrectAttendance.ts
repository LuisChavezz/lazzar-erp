import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { correctAttendance } from "../services/actions";
import type { AttendanceCorrectionBody } from "../interfaces/attendance.interface";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { ATTENDANCE_KEY_ROOT } from "./useAttendance";
import { handleAttendanceWriteError, type SetAttendanceFieldError } from "./attendanceErrorMessages";

export const correctAttendanceMutationKey = ["attendance-correct"] as const;

export interface CorrectAttendanceVariables {
  /** Con `id`: solo se corrige un registro existente. */
  target: AttendanceRowTarget & { id: number };
  body: AttendanceCorrectionBody;
}

/**
 * "Corregir": PATCH de horas y observaciones. Nunca envía `estado`, así que un
 * registro justificado sigue justificado. Los errores del serializer se pintan
 * bajo su campo (`setFieldError`).
 */
export const useCorrectAttendance = (setFieldError?: SetAttendanceFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: correctAttendanceMutationKey,
    mutationFn: ({ target, body }: CorrectAttendanceVariables) => correctAttendance(target.id, body),
    onSuccess: () => {
      toast.success("Registro de asistencia corregido");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleAttendanceWriteError(error, "No se pudo corregir el registro de asistencia.", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY_ROOT }),
  });
};
